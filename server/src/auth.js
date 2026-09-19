const jwt = require('jsonwebtoken');
const { db } = require('./db');

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: 'admin' }, process.env.JWT_SECRET || 'dev-secret-key', { expiresIn: '12h' });
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function adminAuth(req, res, next) {
  try {
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'Admin authentication required' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function deviceAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const device = apiKey ? db.prepare('SELECT * FROM devices WHERE api_key = ?').get(apiKey) : null;
  if (!device) return res.status(401).json({ error: 'Valid device API key required' });
  req.device = device;
  db.prepare('UPDATE devices SET status = ?, last_seen = ? WHERE id = ?').run('online', new Date().toISOString(), device.id);
  next();
}

function anyAuth(req, res, next) {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
      return next();
    } catch (_) { /* Try device credentials below. */ }
  }
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const device = apiKey ? db.prepare('SELECT * FROM devices WHERE api_key = ?').get(apiKey) : null;
  if (device) {
    req.device = device;
    db.prepare('UPDATE devices SET status = ?, last_seen = ? WHERE id = ?').run('online', new Date().toISOString(), device.id);
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { issueToken, adminAuth, deviceAuth, anyAuth };
