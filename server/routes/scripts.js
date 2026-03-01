const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// List scripts visible to the current user
router.get('/', (req, res) => {
  const db = getDb();

  if (req.user.is_admin) {
    // Admins see every active script
    const rows = db.prepare(`
      SELECT s.*, u.display_name as owner_display_name
      FROM scripts s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.active = 1
      ORDER BY s.sort_order ASC, s.id ASC
    `).all();
    return res.json(rows);
  }

  // Regular users see public scripts + their own
  const rows = db.prepare(`
    SELECT s.*, u.display_name as owner_display_name
    FROM scripts s
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE s.active = 1 AND (s.owner_id IS NULL OR s.owner_id = ?)
    ORDER BY s.sort_order ASC, s.id ASC
  `).all(req.user.id);
  res.json(rows);
});

// Create a script
router.post('/', (req, res) => {
  const { title, content, font_size, fg_color, bg_color, scroll_speed, sort_order, owner_id } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Determine ownership
  let finalOwner = null;
  if (owner_id === null || owner_id === undefined || owner_id === '') {
    // Public script — admin only
    if (!req.user.is_admin) {
      // Non-admins default to personal script
      finalOwner = req.user.id;
    }
  } else {
    const ownerId = Number(owner_id);
    if (ownerId !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Cannot create scripts for other users' });
    }
    finalOwner = ownerId;
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO scripts (owner_id, title, content, font_size, fg_color, bg_color, scroll_speed, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalOwner,
    title.trim(),
    content || '',
    font_size ?? 32,
    fg_color || '#FFFFFF',
    bg_color || '#000000',
    scroll_speed ?? 3,
    sort_order ?? 0
  );

  const created = db.prepare(`
    SELECT s.*, u.display_name as owner_display_name
    FROM scripts s
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update a script
router.put('/:id', (req, res) => {
  const db = getDb();
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found' });

  // Authorization: owner or admin
  if (!req.user.is_admin && script.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Changing owner_id requires admin
  let finalOwner = script.owner_id;
  if (req.body.owner_id !== undefined) {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only admins can change script ownership' });
    }
    finalOwner = req.body.owner_id === null || req.body.owner_id === '' ? null : Number(req.body.owner_id);
  }

  const title = req.body.title?.trim() ?? script.title;
  const content = req.body.content !== undefined ? req.body.content : script.content;
  const font_size = req.body.font_size ?? script.font_size;
  const fg_color = req.body.fg_color || script.fg_color;
  const bg_color = req.body.bg_color || script.bg_color;
  const scroll_speed = req.body.scroll_speed ?? script.scroll_speed;
  const sort_order = req.body.sort_order ?? script.sort_order;

  db.prepare(`
    UPDATE scripts SET owner_id=?, title=?, content=?, font_size=?, fg_color=?, bg_color=?,
    scroll_speed=?, sort_order=? WHERE id=?
  `).run(finalOwner, title, content, font_size, fg_color, bg_color, scroll_speed, sort_order, req.params.id);

  const updated = db.prepare(`
    SELECT s.*, u.display_name as owner_display_name
    FROM scripts s
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// Soft-delete a script
router.delete('/:id', (req, res) => {
  const db = getDb();
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found' });

  if (!req.user.is_admin && script.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('UPDATE scripts SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
