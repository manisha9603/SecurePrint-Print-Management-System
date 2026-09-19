import 'dart:convert';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import '../models/log_entry.dart';

class LogService {
  final List<LogEntry> entries = [];
  void add(String message, {LogLevel level = LogLevel.info}) => entries.insert(0, LogEntry(message, level: level));
  Future<File> export() async {
    final directory = await getApplicationSupportDirectory();
    final file = File('${directory.path}${Platform.pathSeparator}printbridge-log-${DateFormat('yyyyMMdd-HHmmss').format(DateTime.now())}.txt');
    await file.writeAsString(entries.reversed.map((entry) => '${DateFormat('yyyy-MM-dd HH:mm:ss').format(entry.timestamp)} [${entry.level.name.toUpperCase()}] ${entry.message}').join('\n'));
    return file;
  }
  String toJson() => jsonEncode(entries.map((entry) => {'timestamp': entry.timestamp.toIso8601String(), 'message': entry.message, 'level': entry.level.name}).toList());
}
