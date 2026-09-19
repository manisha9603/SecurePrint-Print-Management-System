const express = require('express');
const { v4: uuid } = require('uuid');
const { db, serializePrinter } = require('../db');
const { adminAuth, deviceAuth } = require('../auth');

const router = express.Router();

router.get('/', adminAuth, (_req, res) => {
  const devices = db.prepare(`SELECT devices.*, COUNT(printers.id) AS printer_count
    FROM devices LEFT JOIN printers ON printers.device_id = devices.id GROUP BY devices.id ORDER BY devices.created_at DESC`).all();
  res.json({ devices });
});

router.post('/:id/printers', deviceAuth, (req, res) => {
  if (req.device.id !== req.params.id) return res.status(403).json({ error: 'Device key does not match route' });
  if (!Array.isArray(req.body.printers)) return res.status(400).json({ error: 'printers must be an array' });
  const now = new Date().toISOString();
  const sync = db.transaction((printers) => {
    db.prepare('DELETE FROM printers WHERE device_id = ?').run(req.device.id);
    const insert = db.prepare(`INSERT INTO printers (id, device_id, name, ip_address, status, capabilities, last_checked)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    return printers.map((printer) => {
      const item = { id: printer.id || uuid(), device_id: req.device.id, name: String(printer.name || 'Unnamed printer'), ip_address: printer.ip_address || null, status: printer.status || 'online', capabilities: JSON.stringify(printer.capabilities || []), last_checked: now };
      insert.run(item.id, item.device_id, item.name, item.ip_address, item.status, item.capabilities, item.last_checked);
      return serializePrinter(item);
    });
  });
  res.json({ printers: sync(req.body.printers) });
});

module.exports = router;
