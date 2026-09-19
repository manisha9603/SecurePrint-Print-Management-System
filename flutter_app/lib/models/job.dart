enum JobStatus { pending, printing, completed, failed, cancelled }

JobStatus jobStatusFromString(String value) => JobStatus.values.firstWhere((status) => status.name == value, orElse: () => JobStatus.pending);

class PrintJob {
  final String id;
  final String filename;
  final String localPath;
  final String? printerId;
  final String? printerName;
  JobStatus status;
  final DateTime createdAt;
  DateTime updatedAt;
  String? errorMessage;
  int retryCount;

  PrintJob({required this.id, required this.filename, required this.localPath, this.printerId, this.printerName, this.status = JobStatus.pending, required this.createdAt, required this.updatedAt, this.errorMessage, this.retryCount = 0});
  factory PrintJob.fromMap(Map<String, Object?> map) => PrintJob(id: map['id'] as String, filename: map['filename'] as String, localPath: map['local_path'] as String, printerId: map['printer_id'] as String?, printerName: map['printer_name'] as String?, status: jobStatusFromString(map['status'] as String), createdAt: DateTime.parse(map['created_at'] as String), updatedAt: DateTime.parse(map['updated_at'] as String), errorMessage: map['error_message'] as String?, retryCount: (map['retry_count'] as int?) ?? 0);
  Map<String, Object?> toMap() => {'id': id, 'filename': filename, 'local_path': localPath, 'printer_id': printerId, 'printer_name': printerName, 'status': status.name, 'created_at': createdAt.toIso8601String(), 'updated_at': updatedAt.toIso8601String(), 'error_message': errorMessage, 'retry_count': retryCount};
}
