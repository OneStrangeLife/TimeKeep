/**
 * One-off import: appends rows from data/timekeep-export.xlsx into time_entries.
 * Expects columns matching TimeKeep Excel export: Date, User, Client, Project, Start, Stop, Hours, Sales, Notes.
 * Run from project root: node scripts/import-timekeep-excel.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { getDb } = require('../server/db/database');

function roundToQuarterHour(start, stop) {
  if (!start || !stop) return null;
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(stop).split(':').map(Number);
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes <= 0) return null;
  const quarters = Math.floor(totalMinutes / 15);
  const remainder = totalMinutes % 15;
  return remainder >= 7.5 ? (quarters + 1) * 0.25 : quarters * 0.25;
}

function toDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Excel serial
  const n = Number(val);
  if (!Number.isNaN(n) && n > 0) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function toTimeStr(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

function getCellStr(row, colIndex) {
  const v = row.getCell(colIndex)?.value;
  return v != null && v !== '' ? String(v).trim() : null;
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'timekeep-export.xlsx');
  if (!fs.existsSync(dataPath)) {
    console.error('File not found:', dataPath);
    process.exit(1);
  }

  const db = getDb();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataPath);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error('No worksheet in workbook');
    process.exit(1);
  }

  const headerRow = ws.getRow(1);
  const headerMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const title = String(cell.value || '').trim();
    if (title) headerMap[title] = colNumber;
  });

  const col = (name) => headerMap[name] || headerMap[name.toLowerCase()];
  const dateCol = col('Date') ?? col('date');
  const userCol = col('User') ?? col('user');
  const clientCol = col('Client') ?? col('client');
  const projectCol = col('Project') ?? col('project');
  const startCol = col('Start') ?? col('start');
  const stopCol = col('Stop') ?? col('stop');
  const hoursCol = col('Hours') ?? col('hours');
  const salesCol = col('Sales') ?? col('sales');
  const notesCol = col('Notes') ?? col('notes');

  if (!dateCol || !clientCol) {
    console.error('Expected at least Date and Client columns. Headers found:', Object.keys(headerMap));
    process.exit(1);
  }

  const getUser = db.prepare('SELECT id FROM users WHERE (display_name = ? OR username = ?) AND active = 1');
  const getClient = db.prepare('SELECT id FROM clients WHERE name = ? LIMIT 1');
  const insertClient = db.prepare('INSERT INTO clients (name) VALUES (?)');
  const getProject = db.prepare('SELECT id FROM projects WHERE client_id = ? AND name = ? LIMIT 1');
  const insertProject = db.prepare('INSERT INTO projects (client_id, name) VALUES (?, ?)');
  const insertEntry = db.prepare(`
    INSERT INTO time_entries (user_id, client_id, project_id, entry_date, start_time, stop_time, sales_count, duration_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  const insert = db.transaction(() => {
    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const entryDate = toDateStr(row.getCell(dateCol)?.value);
      const clientName = getCellStr(row, clientCol);
      if (!entryDate || !clientName) {
        skipped++;
        continue;
      }

      let userId = null;
      if (userCol) {
        const userVal = getCellStr(row, userCol);
        if (userVal) {
          const u = getUser.get(userVal, userVal);
          if (u) userId = u.id;
          else {
            console.warn(`Row ${rowNum}: user "${userVal}" not found, using first active user`);
          }
        }
      }
      if (!userId) {
        const first = db.prepare('SELECT id FROM users WHERE active = 1 ORDER BY id LIMIT 1').get();
        if (!first) {
          console.error('No active user in database');
          process.exit(1);
        }
        userId = first.id;
      }

      let clientId = getClient.get(clientName)?.id;
      if (!clientId) {
        insertClient.run(clientName);
        clientId = getClient.get(clientName).id;
      }

      let projectId = null;
      const projectName = projectCol ? getCellStr(row, projectCol) : null;
      if (projectName) {
        projectId = getProject.get(clientId, projectName)?.id;
        if (!projectId) {
          insertProject.run(clientId, projectName);
          projectId = getProject.get(clientId, projectName).id;
        }
      }

      const startTime = startCol ? toTimeStr(row.getCell(startCol)?.value) : null;
      const stopTime = stopCol ? toTimeStr(row.getCell(stopCol)?.value) : null;
      let durationHours = hoursCol ? Number(row.getCell(hoursCol)?.value) : null;
      if (durationHours != null && Number.isNaN(durationHours)) durationHours = null;
      if (durationHours == null && startTime && stopTime) {
        durationHours = roundToQuarterHour(startTime, stopTime);
      }
      const salesCount = salesCol ? parseInt(row.getCell(salesCol)?.value, 10) : null;
      const notes = notesCol ? getCellStr(row, notesCol) : null;

      insertEntry.run(
        userId,
        clientId,
        projectId,
        entryDate,
        startTime,
        stopTime,
        salesCount ?? null,
        durationHours,
        notes
      );
      inserted++;
    }
  });

  insert();
  console.log(`Done. Inserted ${inserted} time entries, skipped ${skipped} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
