const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// List all users — admin only
router.get('/', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, display_name, is_admin, active, created_at FROM users ORDER BY created_at ASC'
  ).all();
  res.json(users);
});

// Create user — admin only
router.post('/', requireAdmin, (req, res) => {
  const { username, display_name, password, is_admin } = req.body;
  if (!username || !display_name || !password) {
    return res.status(400).json({ error: 'username, display_name, and password are required' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)'
  ).run(username.trim(), hash, display_name.trim(), is_admin ? 1 : 0);

  const user = db.prepare(
    'SELECT id, username, display_name, is_admin, active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(user);
});

// Update display_name, is_admin, or active — admin only
router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent admin from demoting or deactivating themselves
  if (Number(req.params.id) === req.user.id) {
    if (req.body.is_admin === false || req.body.is_admin === 0) {
      return res.status(400).json({ error: 'You cannot remove your own admin status' });
    }
    if (req.body.active === false || req.body.active === 0) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
  }

  const display_name = req.body.display_name !== undefined ? req.body.display_name.trim() : user.display_name;
  const is_admin = req.body.is_admin !== undefined ? (req.body.is_admin ? 1 : 0) : user.is_admin;
  const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : user.active;

  db.prepare(
    'UPDATE users SET display_name=?, is_admin=?, active=? WHERE id=?'
  ).run(display_name, is_admin, active, req.params.id);

  res.json(db.prepare(
    'SELECT id, username, display_name, is_admin, active, created_at FROM users WHERE id = ?'
  ).get(req.params.id));
});

// Change password — admin can change anyone's, users can change their own (requires current password)
router.put('/:id/password', (req, res) => {
  const targetId = Number(req.params.id);
  const isSelf = targetId === req.user.id;
  const isAdmin = req.user.is_admin;

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Non-admins must provide their current password
  if (isSelf && !isAdmin) {
    if (!current_password) return res.status(400).json({ error: 'Current password required' });
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, targetId);
  res.json({ ok: true });
});

module.exports = router;
