import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../models/device.dart';
import '../models/printer.dart';

class ServerService {
  static const _storage = FlutterSecureStorage();
  String? serverUrl;
  String? apiKey;
  String? deviceId;
  String? deviceName;
  final http.Client client;
  ServerService({http.Client? client}) : client = client ?? http.Client();
  Future<void> load() async { serverUrl = await _storage.read(key: 'server_url'); apiKey = await _storage.read(key: 'api_key'); deviceId = await _storage.read(key: 'device_id'); deviceName = await _storage.read(key: 'device_name'); }
  bool get isConfigured => serverUrl != null && apiKey != null && deviceId != null;
  Uri _uri(String path) => Uri.parse('${serverUrl!.replaceFirst(RegExp(r'/$'), '')}$path');
  Map<String, String> get deviceHeaders => {'Content-Type': 'application/json', 'x-api-key': apiKey!};
  Future<Device> register({required String url, required String name}) async { serverUrl = url.trim().replaceFirst(RegExp(r'/$'), ''); final response = await client.post(_uri('/api/auth/register-device'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'name': name})); final data = _decode(response); apiKey = data['api_key'] as String; deviceId = data['id'] as String; deviceName = data['name'] as String; await _storage.write(key: 'server_url', value: serverUrl); await _storage.write(key: 'api_key', value: apiKey); await _storage.write(key: 'device_id', value: deviceId); await _storage.write(key: 'device_name', value: deviceName); return Device(id: deviceId!, name: deviceName!, apiKey: apiKey!, status: 'online'); }
  Future<void> syncPrinters(List<Printer> printers) async { final response = await client.post(_uri('/api/devices/$deviceId/printers'), headers: deviceHeaders, body: jsonEncode({'printers': printers.map((printer) => {'id': printer.id, 'name': printer.name, 'ip_address': printer.ipAddress, 'status': printer.status, 'capabilities': printer.capabilities}).toList()})); _decode(response); }
  Future<File> downloadJob(String jobId, String filename, Directory directory) async { final response = await client.get(_uri('/api/jobs/$jobId/file'), headers: {'x-api-key': apiKey!}); if (response.statusCode < 200 || response.statusCode >= 300) throw HttpException('Download failed (${response.statusCode})'); final file = File('${directory.path}${Platform.pathSeparator}$jobId-${_safeName(filename)}'); await file.writeAsBytes(response.bodyBytes); return file; }
  Future<void> reportStatus(String jobId, String status, {String? error}) async { final response = await client.patch(_uri('/api/jobs/$jobId/status'), headers: deviceHeaders, body: jsonEncode({'status': status, if (error != null) 'error_message': error})); _decode(response); }
  Future<List<Map<String, dynamic>>> fetchPendingJobs() async { final response = await client.get(_uri('/api/jobs?status=pending&limit=100'), headers: deviceHeaders); final data = _decode(response); return (data['jobs'] as List).cast<Map<String, dynamic>>(); }
  Future<List<Printer>> fetchPrinters() async => (jsonDecode((await client.get(_uri('/api/printers'), headers: deviceHeaders)).body)['printers'] as List).map((item) => Printer.fromMap(item as Map<String, dynamic>)).toList();
  Map<String, dynamic> _decode(http.Response response) { final data = jsonDecode(response.body) as Map<String, dynamic>; if (response.statusCode < 200 || response.statusCode >= 300) throw HttpException(data['error']?.toString() ?? 'Server request failed'); return data; }
  String _safeName(String input) => input.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
  Future<void> clearCredentials() async { await _storage.deleteAll(); serverUrl = null; apiKey = null; deviceId = null; deviceName = null; }
}
