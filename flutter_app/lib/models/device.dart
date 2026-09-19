class Device {
  final String id;
  final String name;
  final String apiKey;
  final String status;
  final DateTime? lastSeen;
  Device({required this.id, required this.name, required this.apiKey, required this.status, this.lastSeen});
  factory Device.fromMap(Map<String, dynamic> map) => Device(id: '${map['id']}', name: '${map['name']}', apiKey: '${map['api_key'] ?? ''}', status: '${map['status'] ?? 'offline'}', lastSeen: map['last_seen'] == null ? null : DateTime.tryParse('${map['last_seen']}'));
}
