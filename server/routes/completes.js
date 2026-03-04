const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getUserId(req) {
  return req.user?.id;
}

// GET /api/completes — list current user's items, ordered by sort_order
router.get('/', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  const rows = db.prepare(
    'SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE user_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(userId);
  res.json(rows);
});

// POST /api/completes — create campaign (body: { name })
router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const db = getDb();
  const userId = getUserId(req);
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM completes_items WHERE user_id = ?').get(userId);
  const sortOrder = maxOrder?.next ?? 0;
  const result = db.prepare(
    'INSERT INTO completes_items (user_id, name, sort_order, count) VALUES (?, ?, ?, 0)'
  ).run(userId, String(name).trim(), sortOrder);
  const row = db.prepare('SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// PUT /api/completes/reorder — body: { order: [id, id, ...] }
router.put('/reorder', (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'order array is required' });
  }
  const db = getDb();
  const userId = getUserId(req);
  const update = db.prepare('UPDATE completes_items SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?');
  order.forEach((id, index) => {
    update.run(index, id, userId);
  });
  const rows = db.prepare(
    'SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE user_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(userId);
  res.json(rows);
});

// POST /api/completes/reset-counts — set count = 0 for all user's items
router.post('/reset-counts', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  db.prepare('UPDATE completes_items SET count = 0, updated_at = datetime(\'now\') WHERE user_id = ?').run(userId);
  const rows = db.prepare(
    'SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE user_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(userId);
  res.json(rows);
});

// POST /api/completes/reset-all — delete all user's items
router.post('/reset-all', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  db.prepare('DELETE FROM completes_items WHERE user_id = ?').run(userId);
  res.json({ ok: true });
});

// Helper: get item and ensure it belongs to user
function getItem(db, id, userId) {
  return db.prepare('SELECT * FROM completes_items WHERE id = ? AND user_id = ?').get(id, userId);
}

// PUT /api/completes/:id — update name and/or sort_order
router.put('/:id', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  const item = getItem(db, req.params.id, userId);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const name = req.body.name !== undefined ? String(req.body.name).trim() : item.name;
  const sort_order = req.body.sort_order !== undefined ? Number(req.body.sort_order) : item.sort_order;
  if (!name) return res.status(400).json({ error: 'name cannot be empty' });

  db.prepare('UPDATE completes_items SET name = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, sort_order, req.params.id);
  const row = db.prepare('SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/completes/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  const item = getItem(db, req.params.id, userId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM completes_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/completes/:id/add — increment count by 1
router.post('/:id/add', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  const item = getItem(db, req.params.id, userId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const amount = req.body?.amount != null ? Math.max(0, Number(req.body.amount)) : 1;
  db.prepare('UPDATE completes_items SET count = count + ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, req.params.id);
  const row = db.prepare('SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE id = ?').get(req.params.id);
  res.json(row);
});

// POST /api/completes/:id/subtract — decrement count by 1 (floor at 0)
router.post('/:id/subtract', (req, res) => {
  const db = getDb();
  const userId = getUserId(req);
  const item = getItem(db, req.params.id, userId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE completes_items SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  const row = db.prepare('SELECT id, name, sort_order, count, created_at, updated_at FROM completes_items WHERE id = ?').get(req.params.id);
  res.json(row);
});

module.exports = router;
