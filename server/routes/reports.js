const express = require('express');
const ExcelJS = require('exceljs');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function buildQuery(start, end, client_id, user_id) {
  const conditions = [];
  const params = [];

  if (start) { conditions.push('te.entry_date >= ?'); params.push(start); }
  if (end)   { conditions.push('te.entry_date <= ?'); params.push(end); }
  if (client_id) { conditions.push('te.client_id = ?'); params.push(client_id); }
  if (user_id)   { conditions.push('te.user_id = ?');   params.push(user_id); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return {
    sql: `
      SELECT te.*, c.name as client_name, p.name as project_name, u.display_name as user_name
      FROM time_entries te
      LEFT JOIN clients c ON te.client_id = c.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN users u ON te.user_id = u.id
      ${where}
      ORDER BY te.entry_date ASC, c.name ASC, p.name ASC
    `,
    params,
  };
}

router.get('/summary', (req, res) => {
  const { start, end, client_id, user_id } = req.query;
  const targetUser = req.user.is_admin ? user_id : req.user.id;
  const db = getDb();
  const { sql, params } = buildQuery(start, end, client_id, targetUser);
  const entries = db.prepare(sql).all(...params);

  // Group by client -> project
  const byClient = {};
  for (const e of entries) {
    const cKey = e.client_id;
    if (!byClient[cKey]) {
      byClient[cKey] = { id: e.client_id, name: e.client_name, projects: {}, total_hours: 0, total_sales: 0 };
    }
    const pKey = e.project_id || '__none__';
    if (!byClient[cKey].projects[pKey]) {
      byClient[cKey].projects[pKey] = { id: e.project_id, name: e.project_name || '(No project)', hours: 0, sales: 0 };
    }
    byClient[cKey].projects[pKey].hours += e.duration_hours || 0;
    byClient[cKey].projects[pKey].sales += e.sales_count || 0;
    byClient[cKey].total_hours += e.duration_hours || 0;
    byClient[cKey].total_sales += e.sales_count || 0;
  }

  const summary = Object.values(byClient).map(c => ({
    ...c,
    projects: Object.values(c.projects),
  }));

  const grand_total_hours = summary.reduce((s, c) => s + c.total_hours, 0);
  const grand_total_sales = summary.reduce((s, c) => s + c.total_sales, 0);

  res.json({ summary, grand_total_hours, grand_total_sales });
});

router.get('/export/csv', (req, res) => {
  const { start, end, client_id, user_id } = req.query;
  const targetUser = req.user.is_admin ? user_id : req.user.id;
  const db = getDb();
  const { sql, params } = buildQuery(start, end, client_id, targetUser);
  const entries = db.prepare(sql).all(...params);

  const rows = [
    ['Date', 'User', 'Client', 'Project', 'Start', 'Stop', 'Hours', 'Sales', 'Notes'],
    ...entries.map(e => [
      e.entry_date,
      e.user_name,
      e.client_name,
      e.project_name || '',
      e.start_time || '',
      e.stop_time || '',
      e.duration_hours != null ? e.duration_hours.toFixed(2) : '',
      e.sales_count || '',
      e.notes || '',
    ]),
  ];

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="timekeep-export.csv"');
  res.send(csv);
});

router.get('/export/excel', async (req, res) => {
  const { start, end, client_id, user_id } = req.query;
  const targetUser = req.user.is_admin ? user_id : req.user.id;
  const db = getDb();
  const { sql, params } = buildQuery(start, end, client_id, targetUser);
  const entries = db.prepare(sql).all(...params);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Time Entries');

  ws.columns = [
    { header: 'Date',    key: 'entry_date',     width: 12 },
    { header: 'User',    key: 'user_name',       width: 20 },
    { header: 'Client',  key: 'client_name',     width: 20 },
    { header: 'Project', key: 'project_name',    width: 20 },
    { header: 'Start',   key: 'start_time',      width: 10 },
    { header: 'Stop',    key: 'stop_time',        width: 10 },
    { header: 'Hours',   key: 'duration_hours',  width: 8  },
    { header: 'Sales',   key: 'sales_count',     width: 8  },
    { header: 'Notes',   key: 'notes',           width: 30 },
  ];

  ws.getRow(1).font = { bold: true };

  entries.forEach(e => {
    ws.addRow({
      ...e,
      project_name: e.project_name || '',
      duration_hours: e.duration_hours != null ? parseFloat(e.duration_hours.toFixed(2)) : null,
      sales_count: e.sales_count || null,
      notes: e.notes || '',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="timekeep-export.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// Print-friendly HTML report
router.get('/export/print', (req, res) => {
  const { start, end, client_id, user_id } = req.query;
  const targetUser = req.user.is_admin ? user_id : req.user.id;
  const db = getDb();
  const { sql, params } = buildQuery(start, end, client_id, targetUser);
  const entries = db.prepare(sql).all(...params);

  const rows = entries.map(e => `
    <tr>
      <td>${e.entry_date}</td>
      <td>${e.user_name || ''}</td>
      <td>${e.client_name || ''}</td>
      <td>${e.project_name || ''}</td>
      <td>${e.start_time || ''}</td>
      <td>${e.stop_time || ''}</td>
      <td>${e.duration_hours != null ? e.duration_hours.toFixed(2) : ''}</td>
      <td>${e.sales_count || ''}</td>
      <td>${e.notes || ''}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>TimeKeep Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
  h1 { font-size: 18px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; }
  @media print { button { display: none; } }
</style>
</head><body>
<h1>TimeKeep Report ${start || ''} – ${end || ''}</h1>
<button onclick="window.print()">Print</button>
<table>
  <thead><tr><th>Date</th><th>User</th><th>Client</th><th>Project</th><th>Start</th><th>Stop</th><th>Hours</th><th>Sales</th><th>Notes</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
