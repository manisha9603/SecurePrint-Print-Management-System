const WebSocket = require('ws');
const { db } = require('../db');

function attach(server, app) {
  const wss = new WebSocket.Server({ noServer: true });
  const clients = new Map();
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));
  app.locals.broadcastJob = (deviceId, message) => {
    const socket = clients.get(deviceId);
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };
  server.on('upgrade', (request, socket, head) => {
    if (!request.url.startsWith('/ws/device')) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });
  wss.on('connection', (ws, request) => {
    const url = new URL(request.url, 'http://localhost');
    const apiKey = url.searchParams.get('api_key') || request.headers['x-api-key'];
    const device = apiKey && db.prepare('SELECT * FROM devices WHERE api_key = ?').get(apiKey);
    if (!device) return ws.close(1008, 'Invalid device API key');
    clients.set(device.id, ws);
    const touch = () => db.prepare('UPDATE devices SET status = ?, last_seen = ? WHERE id = ?').run('online', new Date().toISOString(), device.id);
    touch();
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'heartbeat') touch();
        if (message.type === 'job_status' && message.jobId) {
          const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND target_device_id = ?').get(message.jobId, device.id);
          if (job) app.locals.broadcastAdmin({ type: 'device_job_status', jobId: message.jobId, status: message.status });
        }
      } catch (_) { /* Ignore malformed device messages. */ }
    });
    ws.on('close', () => {
      if (clients.get(device.id) === ws) {
        clients.delete(device.id);
        db.prepare('UPDATE devices SET status = ?, last_seen = ? WHERE id = ?').run('offline', new Date().toISOString(), device.id);
        app.locals.broadcastAdmin({ type: 'device_status', deviceId: device.id, status: 'offline' });
      }
    });
  });
}
module.exports = { attach };
