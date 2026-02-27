const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-dev-secret';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  // Also accept ?token= query param (used for file download links)
  const token = (header && header.startsWith('Bearer ') ? header.slice(7) : null)
    || req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
