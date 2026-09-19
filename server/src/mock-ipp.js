const http = require('http');
const os = require('os');

const DEFAULT_PORT = 9100;
const OP_GET_PRINTER_ATTRIBUTES = 0x000b;
const OP_PRINT_JOB = 0x0002;
const STATUS_OK = 0x0000;
const TAG_OPERATION_ATTRIBUTES = 0x01;
const TAG_JOB_ATTRIBUTES = 0x02;
const TAG_END_OF_ATTRIBUTES = 0x03;
const TAG_CHARSET = 0x47;
const TAG_NATURAL_LANGUAGE = 0x48;
const TAG_URI = 0x45;
const TAG_NAME = 0x42;
const TAG_TEXT = 0x41;
const VALUE_INTEGER = 0x21;
const VALUE_ENUM = 0x23;
const VALUE_BOOLEAN = 0x22;
const VALUE_KEYWORD = 0x44;

function readUInt16(buffer, offset) {
  return buffer.readUInt16BE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function parseRequest(buffer) {
  if (buffer.length < 8) throw new Error('IPP request is shorter than its header');
  const version = `${buffer[0]}.${buffer[1]}`;
  const operation = readUInt16(buffer, 2);
  const requestId = readUInt32(buffer, 4);
  const attributes = {};
  let offset = 8;
  let group = null;
  while (offset < buffer.length) {
    const tag = buffer[offset++];
    if (tag === TAG_END_OF_ATTRIBUTES) break;
    if (tag === TAG_OPERATION_ATTRIBUTES || tag === TAG_JOB_ATTRIBUTES || tag === 0x04 || tag === 0x05) {
      group = tag;
      continue;
    }
    if (offset + 4 > buffer.length) break;
    const nameLength = readUInt16(buffer, offset);
    offset += 2;
    if (offset + nameLength + 2 > buffer.length) break;
    const name = buffer.subarray(offset, offset + nameLength).toString('utf8');
    offset += nameLength;
    const valueLength = readUInt16(buffer, offset);
    offset += 2;
    if (offset + valueLength > buffer.length) break;
    const value = buffer.subarray(offset, offset + valueLength);
    offset += valueLength;
    if (group && name) attributes[name] = { tag, value: value.toString('utf8') };
  }
  return { version, operation, requestId, attributes, document: buffer.subarray(offset) };
}

function encodeAttribute(buffer, tag, name, value) {
  const nameBuffer = Buffer.from(name, 'utf8');
  const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  buffer.push(Buffer.from([tag]));
  const nameLength = Buffer.alloc(2);
  nameLength.writeUInt16BE(nameBuffer.length);
  buffer.push(nameLength, nameBuffer);
  const valueLength = Buffer.alloc(2);
  valueLength.writeUInt16BE(valueBuffer.length);
  buffer.push(valueLength, valueBuffer);
}

function encodeIntegerAttribute(buffer, tag, name, value) {
  const valueBuffer = Buffer.alloc(4);
  valueBuffer.writeInt32BE(value);
  encodeAttribute(buffer, tag, name, valueBuffer);
}

function encodeBooleanAttribute(buffer, name, value) {
  encodeAttribute(buffer, VALUE_BOOLEAN, name, Buffer.from([value ? 1 : 0]));
}

function encodeResponse(request, jobs) {
  const chunks = [];
  const header = Buffer.alloc(8);
  header[0] = 2;
  header[1] = 0;
  header.writeUInt16BE(STATUS_OK, 2);
  header.writeUInt32BE(request.requestId, 4);
  chunks.push(header, Buffer.from([TAG_OPERATION_ATTRIBUTES]));
  encodeAttribute(chunks, TAG_CHARSET, 'attributes-charset', 'utf-8');
  encodeAttribute(chunks, TAG_NATURAL_LANGUAGE, 'attributes-natural-language', 'en');
  encodeAttribute(chunks, TAG_URI, 'printer-uri', 'ipp://localhost:9100/ipp/print');
  if (request.operation === OP_PRINT_JOB) {
    const job = jobs[jobs.length - 1];
    chunks.push(Buffer.from([TAG_JOB_ATTRIBUTES]));
    encodeIntegerAttribute(chunks, VALUE_INTEGER, 'job-id', job.id);
    encodeAttribute(chunks, TAG_URI, 'job-uri', `ipp://localhost:9100/ipp/print/${job.id}`);
    encodeIntegerAttribute(chunks, VALUE_ENUM, 'job-state', 9);
    encodeAttribute(chunks, TAG_TEXT, 'job-state-message', 'Mock printer accepted the document');
  } else {
    chunks.push(Buffer.from([0x04]));
    encodeAttribute(chunks, TAG_NAME, 'printer-name', 'PrintBridge Mock Printer');
    encodeAttribute(chunks, TAG_TEXT, 'printer-info', 'Software IPP printer for PrintBridge testing');
    encodeAttribute(chunks, TAG_TEXT, 'printer-make-and-model', 'PrintBridge Mock IPP 1.0');
    encodeIntegerAttribute(chunks, VALUE_ENUM, 'printer-state', 3);
    encodeAttribute(chunks, VALUE_KEYWORD, 'printer-state-reasons', 'none');
    encodeAttribute(chunks, TAG_TEXT, 'ipp-versions-supported', '1.1');
    encodeAttribute(chunks, TAG_TEXT, 'document-format-supported', 'application/pdf');
    encodeAttribute(chunks, TAG_TEXT, 'document-format-supported', 'application/octet-stream');
    encodeAttribute(chunks, TAG_TEXT, 'operations-supported', String(OP_PRINT_JOB));
    encodeAttribute(chunks, TAG_TEXT, 'operations-supported', String(OP_GET_PRINTER_ATTRIBUTES));
    encodeIntegerAttribute(chunks, VALUE_INTEGER, 'queued-job-count', jobs.length);
    encodeBooleanAttribute(chunks, 'printer-is-accepting-jobs', true);
  }
  chunks.push(Buffer.from([TAG_END_OF_ATTRIBUTES]));
  return Buffer.concat(chunks);
}

function createMockIppServer({ port = DEFAULT_PORT, host = '0.0.0.0', logger = console } = {}) {
  const jobs = [];
  let nextJobId = 1;
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' || !request.url.startsWith('/ipp')) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Mock IPP endpoint is POST /ipp/print');
      return;
    }
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        const parsed = parseRequest(Buffer.concat(chunks));
        if (parsed.operation !== OP_GET_PRINTER_ATTRIBUTES && parsed.operation !== OP_PRINT_JOB) {
          response.writeHead(200, { 'Content-Type': 'application/ipp' });
          response.end(encodeResponse({ ...parsed, operation: OP_GET_PRINTER_ATTRIBUTES }, jobs));
          return;
        }
        if (parsed.operation === OP_PRINT_JOB) {
          const job = { id: nextJobId++, filename: parsed.attributes['job-name']?.value || 'document', bytes: parsed.document.length, createdAt: new Date().toISOString() };
          jobs.push(job);
          logger.log(`[mock-ipp] accepted job ${job.id} (${job.bytes} bytes)`);
        }
        const responseBody = encodeResponse(parsed, jobs);
        response.writeHead(200, { 'Content-Type': 'application/ipp', 'Content-Length': responseBody.length });
        response.end(responseBody);
      } catch (error) {
        logger.error(`[mock-ipp] invalid request: ${error.message}`);
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        response.end(error.message);
      }
    });
  });
  server.on('listening', () => logger.log(`[mock-ipp] listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/ipp/print`));
  return { server, jobs, listen: () => server.listen(port, host), close: () => server.close() };
}

function startFromEnvironment() {
  if (String(process.env.MOCK_IPP_ENABLED).toLowerCase() !== 'true') return null;
  const mock = createMockIppServer({ port: Number(process.env.MOCK_IPP_PORT || DEFAULT_PORT), host: process.env.MOCK_IPP_HOST || '0.0.0.0' });
  mock.listen();
  return mock;
}

if (require.main === module) {
  require('dotenv').config();
  if (!startFromEnvironment()) {
    console.error('[mock-ipp] disabled; set MOCK_IPP_ENABLED=true to start it');
    process.exitCode = 1;
  }
}

module.exports = { createMockIppServer, startFromEnvironment, parseRequest, encodeResponse };
