const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM links ORDER BY sort_order ASC, id ASC').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { title, url, description, sort_order } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'title and url are required' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO links (title, url, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(title.trim(), url.trim(), description?.trim() || null, sort_order ?? 0);
  res.status(201).json(db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const title = req.body.title?.trim() ?? link.title;
  const url = req.body.url?.trim() ?? link.url;
  const description = req.body.description !== undefined ? req.body.description?.trim() || null : link.description;
  const sort_order = req.body.sort_order !== undefined ? req.body.sort_order : link.sort_order;

  db.prepare('UPDATE links SET title=?, url=?, description=?, sort_order=? WHERE id=?')
    .run(title, url, description, sort_order, req.params.id);
  res.json(db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM links WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Link not found' });
  }
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
