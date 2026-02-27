const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  const { client_id } = req.query;
  let query = 'SELECT * FROM projects';
  const params = [];
  if (client_id) {
    query += ' WHERE client_id = ?';
    params.push(client_id);
  }
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { client_id, name } = req.body;
  if (!client_id || !name?.trim()) {
    return res.status(400).json({ error: 'client_id and name required' });
  }
  const db = getDb();
  const result = db
    .prepare('INSERT INTO projects (client_id, name) VALUES (?, ?)')
    .run(client_id, name.trim());
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, active } = req.body;
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  db.prepare('UPDATE projects SET name = ?, active = ? WHERE id = ?').run(
    name ?? project.name,
    active !== undefined ? (active ? 1 : 0) : project.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE projects SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
