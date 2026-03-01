const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM pay_periods ORDER BY start_date ASC').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { period_number, start_date, end_date, label } = req.body;
  if (!period_number || !start_date || !end_date) {
    return res.status(400).json({ error: 'period_number, start_date, and end_date required' });
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO pay_periods (period_number, start_date, end_date, label) VALUES (?, ?, ?, ?)'
  ).run(period_number, start_date, end_date, label || null);
  res.status(201).json(db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(req.params.id);
  if (!period) return res.status(404).json({ error: 'Pay period not found' });

  const period_number = req.body.period_number ?? period.period_number;
  const start_date = req.body.start_date ?? period.start_date;
  const end_date = req.body.end_date ?? period.end_date;
  const label = req.body.label !== undefined ? req.body.label : period.label;

  db.prepare(
    'UPDATE pay_periods SET period_number=?, start_date=?, end_date=?, label=? WHERE id=?'
  ).run(period_number, start_date, end_date, label, req.params.id);

  res.json(db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(req.params.id));
});

router.get('/for-date', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });
  const db = getDb();
  const period = db.prepare(
    'SELECT * FROM pay_periods WHERE start_date <= ? AND end_date >= ?'
  ).get(date, date);
  res.json(period || null);
});

router.post('/generate', requireAdmin, (req, res) => {
  const year = parseInt(req.body.year);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'Valid year required (2000–2100)' });
  }
  const db = getDb();

  // Duplicate guard
  const duplicate = db.prepare(
    "SELECT COUNT(*) as cnt FROM pay_periods WHERE start_date LIKE ?"
  ).get(`${year}-%`);
  if (duplicate.cnt > 0) {
    return res.status(409).json({ error: `Pay periods for ${year} already exist. Delete them first to regenerate.` });
  }

  const existing = db.prepare('SELECT MAX(period_number) as max_num FROM pay_periods').get();
  let periodNum = (existing.max_num || 0) + 1;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const insert = db.prepare('INSERT INTO pay_periods (period_number, start_date, end_date, label) VALUES (?, ?, ?, ?)');
  const created = [];

  for (let m = 0; m < 12; m++) {
    const mm = String(m + 1).padStart(2, '0');
    const lastDay = new Date(year, m + 1, 0).getDate();

    const r1 = insert.run(periodNum++, `${year}-${mm}-01`, `${year}-${mm}-15`, `${months[m]} 1–15, ${year}`);
    created.push(db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(r1.lastInsertRowid));

    const r2 = insert.run(periodNum++, `${year}-${mm}-16`, `${year}-${mm}-${String(lastDay).padStart(2, '0')}`, `${months[m]} 16–${lastDay}, ${year}`);
    created.push(db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(r2.lastInsertRowid));
  }

  res.status(201).json(created);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(req.params.id);
  if (!period) return res.status(404).json({ error: 'Pay period not found' });
  db.prepare('DELETE FROM pay_periods WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
