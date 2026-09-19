require('dotenv').config();
const http = require('http');
const app = require('./src/app')();
const deviceWs = require('./src/websocket/deviceWs');
const adminWs = require('./src/websocket/adminWs');
const { startFromEnvironment: startMockIpp } = require('./src/mock-ipp');

const server = http.createServer(app);
deviceWs.attach(server, app);
adminWs.attach(server, app);
const port = Number(process.env.PORT || 3001);
server.listen(port, () => console.log(`PrintBridge listening on http://localhost:${port}`));
startMockIpp();
