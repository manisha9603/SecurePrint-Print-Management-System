const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');
const { db } = require('../db');
const { issueToken } = require('../auth');

const router = express.Router();

router.post('/register-device', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Device name is required' });
  const device = { id: uuid(), name, apiKey: `pb_${uuid().replace(/-/g, '')}`, createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO devices (id, name, api_key, created_at) VALUES (?, ?, ?, ?)')
    .run(device.id, device.name, device.apiKey, device.createdAt);
  res.status(201).json({ id: device.id, name: device.name, api_key: device.apiKey });
});

router.post('/admin-login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: issueToken(user), username: user.username });
});

module.exports = router;
