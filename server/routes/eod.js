const express = require('express');
const nodemailer = require('nodemailer');
const { getDb } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const EOD_TYPES = ['vici', 'cmg', 'reach', 'reach_and_vici', 'daytime'];

// ---------- Formats CRUD ----------
router.get('/formats', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM eod_formats WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json(rows);
});

router.get('/formats/all', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM eod_formats ORDER BY sort_order ASC, id ASC').all();
  res.json(rows);
});

router.post('/formats', requireAdmin, (req, res) => {
  const { name, type, to_addresses, cc_addresses, subject_template, body_template, sort_order } = req.body || {};
  if (!name || !type || !to_addresses || !subject_template || !body_template) {
    return res.status(400).json({ error: 'name, type, to_addresses, subject_template, body_template required' });
  }
  if (!EOD_TYPES.includes(type)) {
    return res.status(400).json({ error: 'type must be one of: ' + EOD_TYPES.join(', ') });
  }
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO eod_formats (name, type, to_addresses, cc_addresses, subject_template, body_template, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name.trim(),
    type,
    to_addresses.trim(),
    (cc_addresses && cc_addresses.trim()) || null,
    subject_template.trim(),
    body_template.trim(),
    sort_order != null ? Number(sort_order) : 0
  );
  res.status(201).json(db.prepare('SELECT * FROM eod_formats WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/formats/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM eod_formats WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Format not found' });
  const {
    name,
    type,
    to_addresses,
    cc_addresses,
    subject_template,
    body_template,
    sort_order,
    active,
  } = req.body || {};
  const updates = {
    name: name !== undefined ? name.trim() : row.name,
    type: type !== undefined ? type : row.type,
    to_addresses: to_addresses !== undefined ? to_addresses.trim() : row.to_addresses,
    cc_addresses: cc_addresses !== undefined ? (cc_addresses && cc_addresses.trim()) || null : row.cc_addresses,
    subject_template: subject_template !== undefined ? subject_template.trim() : row.subject_template,
    body_template: body_template !== undefined ? body_template.trim() : row.body_template,
    sort_order: sort_order !== undefined ? Number(sort_order) : row.sort_order,
    active: active !== undefined ? (active ? 1 : 0) : row.active,
  };
  if (updates.type && !EOD_TYPES.includes(updates.type)) {
    return res.status(400).json({ error: 'type must be one of: ' + EOD_TYPES.join(', ') });
  }
  db.prepare(
    `UPDATE eod_formats SET name=?, type=?, to_addresses=?, cc_addresses=?, subject_template=?, body_template=?, sort_order=?, active=? WHERE id=?`
  ).run(
    updates.name,
    updates.type,
    updates.to_addresses,
    updates.cc_addresses,
    updates.subject_template,
    updates.body_template,
    updates.sort_order,
    updates.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM eod_formats WHERE id = ?').get(req.params.id));
});

router.delete('/formats/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM eod_formats WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Format not found' });
  db.prepare('UPDATE eod_formats SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Client types ----------
router.get('/client-types', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT ct.client_id, ct.eod_type, c.name as client_name
     FROM eod_client_types ct
     JOIN clients c ON c.id = ct.client_id
     ORDER BY c.name`
  ).all();
  res.json(rows);
});

router.put('/client-types', requireAdmin, (req, res) => {
  const mappings = req.body?.mappings;
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ error: 'mappings array required' });
  }
  const db = getDb();
  db.prepare('DELETE FROM eod_client_types').run();
  const insert = db.prepare('INSERT INTO eod_client_types (client_id, eod_type) VALUES (?, ?)');
  const validTypes = ['vici', 'cmg', 'reach', 'daytime'];
  for (const m of mappings) {
    if (m.client_id == null || m.client_id === '' || !m.eod_type) continue;
    if (!validTypes.includes(m.eod_type)) continue;
    insert.run(Number(m.client_id), m.eod_type);
  }
  res.json(db.prepare('SELECT * FROM eod_client_types').all());
});

// ---------- Send EOD ----------
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

function fillTemplate(template, vars) {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp('{{' + k + '}}', 'gi'), v != null ? String(v) : '');
  }
  return s;
}

router.post('/send', async (req, res) => {
  const date = (req.body && req.body.date) || new Date().toISOString().slice(0, 10);
  const db = getDb();
  const userId = req.user.id;
  const user = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const entries = db.prepare(`
    SELECT te.*, c.name as client_name, p.name as project_name
    FROM time_entries te
    LEFT JOIN clients c ON te.client_id = c.id
    LEFT JOIN projects p ON te.project_id = p.id
    WHERE te.user_id = ? AND te.entry_date = ?
    ORDER BY c.name, p.name
  `).all(userId, date);

  if (entries.length === 0) {
    return res.status(400).json({ error: 'No entries for this date' });
  }

  const clientTypes = {};
  db.prepare('SELECT client_id, eod_type FROM eod_client_types').all().forEach(r => {
    clientTypes[r.client_id] = r.eod_type;
  });

  const byClient = {};
  for (const e of entries) {
    const cid = e.client_id;
    if (!byClient[cid]) {
      byClient[cid] = {
        client_id: cid,
        client_name: e.client_name,
        eod_type: clientTypes[cid] || 'daytime',
        projects: {},
        total_hours: 0,
        total_sales: 0,
      };
    }
    const pkey = e.project_id || '__none__';
    if (!byClient[cid].projects[pkey]) {
      byClient[cid].projects[pkey] = {
        project_name: e.project_name || '(No project)',
        hours: 0,
        sales: 0,
      };
    }
    byClient[cid].projects[pkey].hours += e.duration_hours || 0;
    byClient[cid].projects[pkey].sales += e.sales_count || 0;
    byClient[cid].total_hours += e.duration_hours || 0;
    byClient[cid].total_sales += (e.sales_count || 0);
  }

  const typesPresent = [...new Set(Object.values(byClient).map(c => c.eod_type))];
  let formatType = 'daytime';
  if (typesPresent.length === 1) {
    formatType = typesPresent[0];
  } else if (typesPresent.includes('reach') && typesPresent.includes('vici')) {
    formatType = 'reach_and_vici';
  }

  const format = db.prepare('SELECT * FROM eod_formats WHERE type = ? AND active = 1').get(formatType);
  if (!format) {
    return res.status(400).json({ error: `No EOD format configured for type: ${formatType}. Add one in Setup.` });
  }

  const transporter = getTransporter();
  if (!transporter) {
    return res.status(503).json({ error: 'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.' });
  }

  const from = process.env.EOD_FROM || process.env.SMTP_USER;
  const dateObj = new Date(date + 'T12:00:00');
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const dateStr = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${dateObj.getFullYear()}`;
  const dateStrShort = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`;

  let subject = fillTemplate(format.subject_template, { d, m, Date: dateStr, UserName: user.display_name });
  let body;

  if (formatType === 'reach_and_vici') {
    const reachClients = Object.values(byClient).filter(c => c.eod_type === 'reach');
    const viciClients = Object.values(byClient).filter(c => c.eod_type === 'vici');
    const buildBlock = (list) => {
      if (list.length === 0) return '';
      const parts = [];
      for (const c of list) {
        const campaignName = Object.keys(c.projects).length === 1
          ? Object.values(c.projects)[0].project_name
          : c.client_name;
        const hours = (c.total_hours || 0).toFixed(2);
        const completes = c.total_sales || 0;
        parts.push(`Campaign: ${campaignName}\nHours: ${hours}\nCompletes: ${completes}`);
      }
      return parts.join('\n\n');
    };
    const reachBlock = buildBlock(reachClients);
    const viciBlock = buildBlock(viciClients);
    body = fillTemplate(format.body_template, {
      ReachBlock: reachBlock,
      ViciBlock: viciBlock,
      Date: dateStrShort,
      UserName: user.display_name,
    });
  } else {
    const list = Object.values(byClient);
    const campaignName = list.length === 1 && Object.keys(list[0].projects).length === 1
      ? Object.values(list[0].projects)[0].project_name
      : list.map(c => c.client_name).join(', ');
    const hours = list.reduce((s, c) => s + (c.total_hours || 0), 0).toFixed(2);
    const completes = list.reduce((s, c) => s + (c.total_sales || 0), 0);
    body = fillTemplate(format.body_template, {
      Campaign: campaignName,
      Hours: hours,
      Completes: completes,
      Date: dateStrShort,
      UserName: user.display_name,
    });
  }

  const mailOptions = {
    from,
    to: format.to_addresses,
    cc: format.cc_addresses || undefined,
    subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: 'EOD report sent' });
  } catch (err) {
    console.error('EOD send error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

module.exports = router;
