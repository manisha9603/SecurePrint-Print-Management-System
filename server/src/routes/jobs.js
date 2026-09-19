const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const { db } = require('../db');
const { adminAuth, anyAuth } = require('../auth');

const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, Boolean(file.originalname))
});
const router = express.Router();

router.post('/', adminAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A file is required' });
  const targetDeviceId = String(req.body.target_device_id || '');
  const targetPrinterId = req.body.target_printer_id ? String(req.body.target_printer_id) : null;
  const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(targetDeviceId);
  const printer = targetPrinterId ? db.prepare('SELECT id FROM printers WHERE id = ? AND device_id = ?').get(targetPrinterId, targetDeviceId) : null;
  if (!device || (targetPrinterId && !printer)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Target device or printer is invalid' });
  }
  const now = new Date().toISOString();
  const job = { id: uuid(), filename: req.file.originalname, filePath: req.file.path, targetDeviceId, targetPrinterId, status: 'queued', createdAt: now, updatedAt: now };
  db.prepare(`INSERT INTO jobs (id, filename, file_path, target_device_id, target_printer_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(job.id, job.filename, job.filePath, job.targetDeviceId, job.targetPrinterId, job.status, now, now);
  const responseJob = { id: job.id, filename: job.filename, target_device_id: targetDeviceId, target_printer_id: targetPrinterId, status: job.status, created_at: now, updated_at: now };
  req.app.locals.broadcastJob(targetDeviceId, { type: 'new_job', jobId: job.id, filename: job.filename, printerId: targetPrinterId });
  req.app.locals.broadcastAdmin({ type: 'job_created', job: responseJob });
  res.status(201).json(responseJob);
});

router.get('/', anyAuth, (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const filters = [];
  const values = [];
  if (req.device) { filters.push('jobs.target_device_id = ?'); values.push(req.device.id); }
  if (req.query.status) { filters.push('jobs.status = ?'); values.push(String(req.query.status) === 'pending' ? 'queued' : String(req.query.status)); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM jobs ${where}`).get(...values).count;
  const jobs = db.prepare(`SELECT jobs.*, devices.name AS device_name, printers.name AS printer_name
    FROM jobs LEFT JOIN devices ON devices.id = jobs.target_device_id LEFT JOIN printers ON printers.id = jobs.target_printer_id
    ${where} ORDER BY jobs.created_at DESC LIMIT ? OFFSET ?`).all(...values, limit, offset);
  res.json({ jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/:id/file', anyAuth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (req.device && req.device.id !== job.target_device_id) return res.status(403).json({ error: 'Job is assigned to another device' });
  if (!fs.existsSync(job.file_path)) return res.status(404).json({ error: 'Job file is unavailable' });
  res.download(job.file_path, job.filename);
});

router.patch('/:id/status', anyAuth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (req.device && req.device.id !== job.target_device_id) return res.status(403).json({ error: 'Job is assigned to another device' });
  const allowed = ['queued', 'printing', 'completed', 'failed', 'cancelled'];
  const status = String(req.body.status || '');
  if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  const now = new Date().toISOString();
  const retryCount = status === 'failed' && req.body.retry_count !== undefined ? Number(req.body.retry_count) : job.retry_count;
  db.prepare('UPDATE jobs SET status = ?, updated_at = ?, retry_count = ?, error_message = ? WHERE id = ?')
    .run(status, now, retryCount, req.body.error_message || null, job.id);
  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id);
  req.app.locals.broadcastAdmin({ type: 'job_updated', job: updated });
  res.json(updated);
});

module.exports = router;
