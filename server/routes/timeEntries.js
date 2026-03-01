const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// "HH:MM" strings -> duration in hours, rounded to nearest quarter
function roundToQuarterHour(start, stop) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = stop.split(':').map(Number);
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes <= 0) return 0;
  const quarters = Math.floor(totalMinutes / 15);
  const remainder = totalMinutes % 15;
  return remainder >= 7.5 ? (quarters + 1) * 0.25 : quarters * 0.25;
}

router.get('/history', (req, res) => {
  const db = getDb();
  const targetUser = req.user.id;
  const rows = db.prepare(`
    SELECT entry_date, COUNT(*) as entry_count, SUM(duration_hours) as total_hours
    FROM time_entries
    WHERE user_id = ? AND entry_date >= date('now', '-30 days')
    GROUP BY entry_date
    ORDER BY entry_date DESC
  `).all(targetUser);
  res.json(rows);
});

router.get('/', (req, res) => {
  const { date, user_id } = req.query;
  const db = getDb();

  // Non-admins can only see their own entries
  const targetUser = req.user.is_admin && user_id ? user_id : req.user.id;

  let query = `
    SELECT te.*, c.name as client_name, p.name as project_name, u.display_name as user_name
    FROM time_entries te
    LEFT JOIN clients c ON te.client_id = c.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN users u ON te.user_id = u.id
    WHERE te.user_id = ?
  `;
  const params = [targetUser];

  if (date) {
    query += ' AND te.entry_date = ?';
    params.push(date);
  }
  query += ' ORDER BY te.start_time ASC, te.id ASC';

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { client_id, project_id, entry_date, start_time, stop_time, sales_count, notes, user_id: bodyUserId } = req.body;
  if (!client_id || !entry_date) {
    return res.status(400).json({ error: 'client_id and entry_date required' });
  }

  const db = getDb();
  let targetUserId = req.user.id;
  if (bodyUserId != null && bodyUserId !== '') {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only admins can create entries for another user' });
    }
    const targetUser = db.prepare('SELECT id, active FROM users WHERE id = ?').get(bodyUserId);
    if (!targetUser || !targetUser.active) {
      return res.status(400).json({ error: 'Invalid or inactive user' });
    }
    targetUserId = targetUser.id;
  }

  let duration_hours = null;
  if (start_time && stop_time) {
    duration_hours = roundToQuarterHour(start_time, stop_time);
  }

  const result = db.prepare(`
    INSERT INTO time_entries (user_id, client_id, project_id, entry_date, start_time, stop_time, sales_count, duration_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(targetUserId, client_id, project_id || null, entry_date, start_time || null, stop_time || null, sales_count || null, duration_hours, notes || null);

  res.status(201).json(db.prepare(`
    SELECT te.*, c.name as client_name, p.name as project_name
    FROM time_entries te
    LEFT JOIN clients c ON te.client_id = c.id
    LEFT JOIN projects p ON te.project_id = p.id
    WHERE te.id = ?
  `).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (!req.user.is_admin && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const client_id = req.body.client_id ?? entry.client_id;
  const project_id = req.body.project_id !== undefined ? req.body.project_id : entry.project_id;
  const entry_date = req.body.entry_date ?? entry.entry_date;
  const start_time = req.body.start_time !== undefined ? req.body.start_time : entry.start_time;
  const stop_time = req.body.stop_time !== undefined ? req.body.stop_time : entry.stop_time;
  const sales_count = req.body.sales_count !== undefined ? req.body.sales_count : entry.sales_count;
  const notes = req.body.notes !== undefined ? req.body.notes : entry.notes;

  let duration_hours = entry.duration_hours;
  if (start_time && stop_time) {
    duration_hours = roundToQuarterHour(start_time, stop_time);
  } else if (!stop_time) {
    duration_hours = null;
  }

  db.prepare(`
    UPDATE time_entries SET client_id=?, project_id=?, entry_date=?, start_time=?, stop_time=?,
    sales_count=?, duration_hours=?, notes=? WHERE id=?
  `).run(client_id, project_id, entry_date, start_time, stop_time, sales_count, duration_hours, notes, req.params.id);

  res.json(db.prepare(`
    SELECT te.*, c.name as client_name, p.name as project_name
    FROM time_entries te
    LEFT JOIN clients c ON te.client_id = c.id
    LEFT JOIN projects p ON te.project_id = p.id
    WHERE te.id = ?
  `).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (!req.user.is_admin && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
