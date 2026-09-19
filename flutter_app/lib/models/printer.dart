class Printer {
  final String id;
  final String name;
  final String? ipAddress;
  final String status;
  final List<String> capabilities;
  final String? deviceId;
  Printer({required this.id, required this.name, this.ipAddress, this.status = 'unknown', this.capabilities = const [], this.deviceId});
  factory Printer.fromMap(Map<String, dynamic> map) => Printer(id: '${map['id']}', name: '${map['name'] ?? 'Unnamed printer'}', ipAddress: map['ip_address'] as String?, status: '${map['status'] ?? 'unknown'}', capabilities: (map['capabilities'] as List?)?.map((item) => '$item').toList() ?? const [], deviceId: map['device_id'] as String?);
}
