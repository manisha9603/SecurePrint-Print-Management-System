const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

function attach(server, app) {
  const wss = new WebSocket.Server({ noServer: true });
  const clients = new Set();
  app.locals.broadcastAdmin = (message) => {
    const payload = JSON.stringify(message);
    for (const client of clients) if (client.readyState === WebSocket.OPEN) client.send(payload);
  };
  server.on('upgrade', (request, socket, head) => {
    if (!request.url.startsWith('/ws/admin')) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });
  wss.on('connection', (ws, request) => {
    const token = new URL(request.url, 'http://localhost').searchParams.get('token');
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    } catch (_) {
      ws.close(1008, 'Invalid admin token');
      return;
    }
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected' }));
    ws.on('close', () => clients.delete(ws));
  });
}
module.exports = { attach };
