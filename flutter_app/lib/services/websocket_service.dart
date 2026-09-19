import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/job.dart';

class WebsocketService {
  WebSocketChannel? _channel;
  Timer? _heartbeat;
  final StreamController<Map<String, dynamic>> _messages = StreamController.broadcast();
  Stream<Map<String, dynamic>> get messages => _messages.stream;
  bool connected = false;
  Future<void> connect(String serverUrl, String apiKey, {Future<void> Function()? onConnected}) async { disconnect(); final base = serverUrl.replaceFirst(RegExp(r'^http'), 'ws').replaceFirst(RegExp(r'/$'), ''); _channel = WebSocketChannel.connect(Uri.parse('$base/ws/device?api_key=${Uri.encodeQueryComponent(apiKey)}')); await _channel!.ready; connected = true; _channel!.stream.listen((data) { final message = jsonDecode(data as String) as Map<String, dynamic>; _messages.add(message); }, onDone: () { connected = false; _heartbeat?.cancel(); }, onError: (_) { connected = false; }); _heartbeat = Timer.periodic(const Duration(seconds: 30), (_) => send({'type': 'heartbeat'})); if (onConnected != null) await onConnected(); }
  void send(Map<String, dynamic> message) { if (connected) _channel?.sink.add(jsonEncode(message)); }
  void reportJob(String jobId, JobStatus status) => send({'type': 'job_status', 'jobId': jobId, 'status': status.name});
  void disconnect() { _heartbeat?.cancel(); _channel?.sink.close(); _channel = null; connected = false; }
  void dispose() { disconnect(); _messages.close(); }
}
