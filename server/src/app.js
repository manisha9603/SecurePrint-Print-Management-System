require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const devicesRoutes = require('./routes/devices');
const printersRoutes = require('./routes/printers');

function createApp() {
  const app = express();
  app.locals.broadcastJob = () => {};
  app.locals.broadcastAdmin = () => {};
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'printbridge' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/printers', printersRoutes);
  app.use((error, _req, res, _next) => {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large' });
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = createApp;
