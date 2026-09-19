const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'printbridge.db'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'offline',
    last_seen TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'unknown',
    capabilities TEXT NOT NULL DEFAULT '[]',
    last_checked TEXT
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    target_device_id TEXT NOT NULL REFERENCES devices(id),
    target_printer_id TEXT REFERENCES printers(id),
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_target_device ON jobs(target_device_id);
`);

const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (!adminExists) {
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
    .run('admin', bcrypt.hashSync(password, 10));
}

function serializePrinter(row) {
  if (!row) return row;
  return { ...row, capabilities: JSON.parse(row.capabilities || '[]') };
}

function serializeJob(row) {
  return row ? { ...row } : row;
}

module.exports = { db, serializePrinter, serializeJob };
