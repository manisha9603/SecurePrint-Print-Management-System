enum LogLevel { info, success, warning, error }
class LogEntry {
  final DateTime timestamp;
  final String message;
  final LogLevel level;
  LogEntry(this.message, {this.level = LogLevel.info, DateTime? timestamp}) : timestamp = timestamp ?? DateTime.now();
}
