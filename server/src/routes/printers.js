const express = require('express');
const { db, serializePrinter } = require('../db');
const { adminAuth } = require('../auth');

const router = express.Router();
router.get('/', adminAuth, (req, res) => {
  const printers = db.prepare(`SELECT printers.*, devices.name AS device_name
    FROM printers JOIN devices ON devices.id = printers.device_id ORDER BY printers.name`).all().map(serializePrinter);
  res.json({ printers });
});
module.exports = router;
