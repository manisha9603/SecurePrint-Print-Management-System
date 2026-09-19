import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/job.dart';
import '../models/log_entry.dart';
import 'ipp_service.dart';
import 'log_service.dart';
import 'server_service.dart';

class QueueService {
  Database? _database;
  final ServerService server;
  final IppService ipp;
  final LogService logs;
  QueueService(this.server, this.ipp, this.logs);
  Future<Database> get database async { if (_database != null) return _database!; final directory = await getApplicationSupportDirectory(); _database = await databaseFactoryFfi.openDatabase(p.join(directory.path, 'printbridge.db'), options: OpenDatabaseOptions(version: 1, onCreate: (db, _) => db.execute('CREATE TABLE jobs (id TEXT PRIMARY KEY, filename TEXT NOT NULL, local_path TEXT NOT NULL, printer_id TEXT, printer_name TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, error_message TEXT, retry_count INTEGER NOT NULL DEFAULT 0)'))); return _database!; }
  Future<List<PrintJob>> all() async => (await (await database).query('jobs', orderBy: 'created_at DESC')).map(PrintJob.fromMap).toList();
  Future<void> accept(Map<String, dynamic> message, {String? printerName}) async { final directory = await getApplicationSupportDirectory(); final file = await server.downloadJob(message['jobId'] as String, message['filename'] as String, directory); final now = DateTime.now(); final job = PrintJob(id: message['jobId'] as String, filename: message['filename'] as String, localPath: file.path, printerId: message['printerId'] as String?, printerName: printerName, createdAt: now, updatedAt: now); await (await database).insert('jobs', job.toMap(), conflictAlgorithm: ConflictAlgorithm.replace); logs.add('Received ${job.filename} from server', level: LogLevel.success); }
  Future<void> process(PrintJob job, String printerUri) async { final updated = DateTime.now(); await update(job..status = JobStatus.printing..updatedAt = updated); await server.reportStatus(job.id, 'printing'); try { await ipp.printJob(Uri.parse(printerUri), File(job.localPath), job.filename); job.status = JobStatus.completed; job.updatedAt = DateTime.now(); await update(job); await server.reportStatus(job.id, 'completed'); logs.add('Printed ${job.filename}', level: LogLevel.success); } catch (error) { job.status = JobStatus.failed; job.errorMessage = error.toString(); job.updatedAt = DateTime.now(); await update(job); await server.reportStatus(job.id, 'failed', error: job.errorMessage); logs.add('Print failed: ${job.errorMessage}', level: LogLevel.error); } }
  Future<void> update(PrintJob job) async => (await database).update('jobs', job.toMap(), where: 'id = ?', whereArgs: [job.id]);
  Future<void> dispose() async => _database?.close();
}
