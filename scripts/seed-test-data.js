/**
 * Seed script: creates 10 test users + January 2026 time entries.
 * Uses existing active clients and projects.
 *
 * Usage:
 *   node scripts/seed-test-data.js           # run (skips existing test users)
 *   node scripts/seed-test-data.js --purge   # remove test users & their entries, then reseed
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { getDb } = require('../server/db/database');

const TEST_USERS = [
  { username: 'smitchell',  display_name: 'Sarah Mitchell'  },
  { username: 'jchen',      display_name: 'James Chen'      },
  { username: 'mrodriguez', display_name: 'Maria Rodriguez' },
  { username: 'tbrooks',    display_name: 'Tyler Brooks'    },
  { username: 'aturner',    display_name: 'Ashley Turner'   },
  { username: 'dpatel',     display_name: 'Devon Patel'     },
  { username: 'rkim',       display_name: 'Rachel Kim'      },
  { username: 'mjohnson',   display_name: 'Marcus Johnson'  },
  { username: 'canderson',  display_name: 'Chloe Anderson'  },
  { username: 'ewilliams',  display_name: 'Ethan Williams'  },
];

const NOTES_POOL = [
  'Good session',
  'Busy day',
  'Follow-ups scheduled',
  'Left several voicemails',
  'Strong leads — callbacks tomorrow',
  'Slow start, picked up later',
  'Connected with decision maker',
  'Several no-answers',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted sales: ~15% null, ~65% 2-7, ~20% 8-19 */
function randomSales() {
  const r = Math.random();
  if (r < 0.15) return null;
  if (r < 0.80) return Math.floor(Math.random() * 6) + 2;  // 2–7
  return Math.floor(Math.random() * 12) + 8;               // 8–19
}

function roundToQuarterMins(mins) {
  return Math.round(mins / 15) * 15;
}

function addMins(h, m, delta) {
  const total = h * 60 + m + delta;
  return [Math.floor(total / 60) % 24, total % 60];
}

function fmt(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate 2–4 consecutive time entries for one user on one day.
 * Day spans ~7.5–8.5 hours starting between 07:30 and 09:15.
 */
function generateDayEntries(userId, date, clientProjects) {
  const numEntries = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4

  // Random day start (quarter-hour aligned)
  const startH = 7 + Math.floor(Math.random() * 2);
  const startM = roundToQuarterMins(Math.floor(Math.random() * 105)); // 0–105 → 0–105 mins past hour
  const totalDayMins = roundToQuarterMins(450 + Math.floor(Math.random() * 61)); // 7.5–8.5 hrs

  const entries = [];
  let [curH, curM] = [startH, startM];
  let remainingMins = totalDayMins;

  for (let i = 0; i < numEntries; i++) {
    const isLast = i === numEntries - 1;
    let sliceMins;

    if (isLast) {
      sliceMins = roundToQuarterMins(Math.max(remainingMins, 30));
    } else {
      const avg = Math.floor(remainingMins / (numEntries - i));
      const variance = Math.floor(avg * 0.3);
      sliceMins = roundToQuarterMins(
        Math.max(30, avg + Math.floor(Math.random() * (variance * 2 + 1)) - variance)
      );
    }

    const startTime = fmt(curH, curM);
    const [endH, endM] = addMins(curH, curM, sliceMins);
    const stopTime = fmt(endH, endM);
    const durationHours = sliceMins / 60;

    const cp = pick(clientProjects);
    entries.push({
      user_id:        userId,
      client_id:      cp.client_id,
      project_id:     cp.id,
      entry_date:     date,
      start_time:     startTime,
      stop_time:      stopTime,
      duration_hours: durationHours,
      sales_count:    randomSales(),
      notes:          Math.random() < 0.18 ? pick(NOTES_POOL) : null,
    });

    [curH, curM] = [endH, endM];
    remainingMins -= sliceMins;
  }

  return entries;
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const purge = process.argv.includes('--purge');
  const db = getDb();

  const clientProjects = db.prepare(`
    SELECT p.id, p.client_id, p.name AS project_name, c.name AS client_name
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    WHERE p.active = 1 AND c.active = 1
  `).all();

  if (!clientProjects.length) {
    console.error('No active clients/projects found. Aborting.');
    process.exit(1);
  }

  console.log(`Found ${clientProjects.length} active client/project combinations.`);

  const testUsernames = TEST_USERS.map(u => u.username);
  const placeholders  = testUsernames.map(() => '?').join(',');

  // ── purge ──
  if (purge) {
    const existing = db.prepare(`SELECT id FROM users WHERE username IN (${placeholders})`).all(...testUsernames);
    if (existing.length) {
      const ids    = existing.map(r => r.id);
      const idPH   = ids.map(() => '?').join(',');
      const delE   = db.prepare(`DELETE FROM time_entries WHERE user_id IN (${idPH}) AND entry_date BETWEEN '2026-01-01' AND '2026-01-31'`);
      const delU   = db.prepare(`DELETE FROM users WHERE id IN (${idPH})`);
      const deleted = db.transaction(() => {
        const { changes: ec } = delE.run(...ids);
        delU.run(...ids);
        return ec;
      })();
      console.log(`Purged ${existing.length} test users and ${deleted} January entries.`);
    } else {
      console.log('No existing test users found — nothing to purge.');
    }
  }

  // ── guard: skip if already seeded ──
  const alreadyExists = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE username IN (${placeholders})`).get(...testUsernames);
  if (alreadyExists.n > 0) {
    console.log(`${alreadyExists.n} test user(s) already exist. Run with --purge to reseed.`);
    process.exit(0);
  }

  // ── create users ──
  const passwordHash = bcrypt.hashSync('password123', 10);
  const insertUser   = db.prepare('INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, 0)');
  const getUser      = db.prepare('SELECT id FROM users WHERE username = ?');

  const seededUsers = [];
  for (const u of TEST_USERS) {
    insertUser.run(u.username, passwordHash, u.display_name);
    const { id } = getUser.get(u.username);
    seededUsers.push({ ...u, id });
  }
  console.log(`Created ${seededUsers.length} test users (password: password123):`);
  seededUsers.forEach(u => console.log(`  ${u.display_name} — ${u.username} (id ${u.id})`));

  // ── generate entries ──
  const insertEntry = db.prepare(`
    INSERT INTO time_entries
      (user_id, client_id, project_id, entry_date, start_time, stop_time, sales_count, duration_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalEntries = 0;

  const seed = db.transaction(() => {
    for (let day = 1; day <= 31; day++) {
      const date = `2026-01-${String(day).padStart(2, '0')}`;
      for (const user of seededUsers) {
        const entries = generateDayEntries(user.id, date, clientProjects);
        for (const e of entries) {
          insertEntry.run(
            e.user_id, e.client_id, e.project_id, e.entry_date,
            e.start_time, e.stop_time, e.sales_count ?? null,
            e.duration_hours, e.notes
          );
          totalEntries++;
        }
      }
    }
  });

  seed();

  const avgPerDay = (totalEntries / (31 * seededUsers.length)).toFixed(1);
  console.log(`\nSeeded ${totalEntries} time entries across January 2026.`);
  console.log(`Average ${avgPerDay} entries/user/day across ${seededUsers.length} users × 31 days.`);
}

main();
