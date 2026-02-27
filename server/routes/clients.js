const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  res.json(clients);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const db = getDb();
  const result = db.prepare('INSERT INTO clients (name) VALUES (?)').run(name.trim());
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const { name, active } = req.body;
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  db.prepare('UPDATE clients SET name = ?, active = ? WHERE id = ?').run(
    name ?? client.name,
    active !== undefined ? (active ? 1 : 0) : client.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
