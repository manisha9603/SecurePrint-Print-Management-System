import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:launch_at_startup/launch_at_startup.dart';
import 'package:provider/provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:tray_manager/tray_manager.dart';
import 'package:window_manager/window_manager.dart';
import 'models/job.dart';
import 'models/log_entry.dart';
import 'models/printer.dart';
import 'screens/logs_screen.dart';
import 'screens/printers_screen.dart';
import 'screens/queue_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/setup_screen.dart';
import 'services/ipp_service.dart';
import 'services/log_service.dart';
import 'services/printer_discovery_service.dart';
import 'services/queue_service.dart';
import 'services/server_service.dart';
import 'services/websocket_service.dart';
import 'theme/app_theme.dart';
import 'widgets/nav_rail.dart';

final _startup = launchAtStartup;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  await windowManager.ensureInitialized();
  _startup.setup(appName: 'PrintBridge Agent', appPath: Platform.resolvedExecutable, packageName: 'com.printbridge.agent');
  await windowManager.waitUntilReadyToShow(const WindowOptions(size: Size(1100, 720), minimumSize: Size(800, 600), title: 'PrintBridge Agent'), () async { await windowManager.show(); await windowManager.focus(); });
  final server = ServerService();
  final logs = LogService();
  final ipp = IppService();
  final app = AppState(server, WebsocketService(), QueueService(server, ipp, logs), PrinterDiscoveryService(ipp), logs);
  await app.initialize();
  await _setupTray(app);
  runApp(ChangeNotifierProvider.value(value: app, child: const PrintBridgeApp()));
}

Future<void> _setupTray(AppState app) async {
  await trayManager.setIcon('assets/tray_icon.svg');
  await trayManager.setToolTip('PrintBridge Agent');
  await trayManager.setContextMenu(Menu(items: [MenuItem(key: 'open', label: 'Open App'), MenuItem.separator(), MenuItem(key: 'pause', label: 'Pause Queue'), MenuItem(key: 'quit', label: 'Quit')]));
  trayManager.addListener(_TrayListener(app));
}

class _TrayListener with TrayListener {
  final AppState app;
  _TrayListener(this.app);
  @override Future<void> onTrayIconMouseDown() async => windowManager.show();
  @override Future<void> onTrayMenuItemClick(MenuItem menuItem) async { if (menuItem.key == 'open') await windowManager.show(); if (menuItem.key == 'pause') app.togglePaused(); if (menuItem.key == 'quit') { app.allowQuit = true; await windowManager.close(); } }
}

class AppState extends ChangeNotifier {
  final ServerService server;
  final WebsocketService socket;
  final QueueService queue;
  final PrinterDiscoveryService discovery;
  final LogService logs;
  final List<PrintJob> jobs = [];
  final List<Printer> printers = [];
  StreamSubscription<Map<String, dynamic>>? _messages;
  int tab = 0;
  bool initialized = false, connected = false, darkMode = true, autoStart = false, paused = false, allowQuit = false;
  String? defaultPrinterId;
  Duration pollingInterval = PrinterDiscoveryService.pollingInterval;
  Timer? _poller;
  AppState(this.server, this.socket, this.queue, this.discovery, this.logs);
  Future<void> initialize() async { await server.load(); jobs.addAll(await queue.all()); if (server.isConfigured) { await _connect(); } initialized = true; notifyListeners(); }
  Future<void> register(String url, String name) async { await server.register(url: url, name: name); logs.add('Registered device ${server.deviceName}', level: LogLevel.success); await _connect(); initialized = true; notifyListeners(); }
  Future<void> _connect() async { try { await socket.connect(server.serverUrl!, server.apiKey!, onConnected: _recoverPendingJobs); connected = true; logs.add('Connected to ${server.serverUrl}', level: LogLevel.success); _messages?.cancel(); _messages = socket.messages.listen(_handleMessage); await refreshPrinters(); } catch (error) { connected = false; logs.add('Connection failed: $error', level: LogLevel.error); } _poller?.cancel(); _poller = Timer.periodic(pollingInterval, (_) => refreshPrinters()); }
  Future<void> _recoverPendingJobs() async { try { final pending = await server.fetchPendingJobs(); for (final job in pending) { if (!jobs.any((local) => local.id == job['id'])) { await queue.accept({'jobId': job['id'], 'filename': job['filename'], 'printerId': job['target_printer_id']}); } } jobs..clear()..addAll(await queue.all()); logs.add('Recovered ${pending.length} pending job(s) after reconnect'); notifyListeners(); } catch (error) { logs.add('Pending job recovery failed: $error', level: LogLevel.warning); } }
  Future<void> _handleMessage(Map<String, dynamic> message) async { if (message['type'] != 'new_job' || paused) return; try { await queue.accept(message); jobs..clear()..addAll(await queue.all()); notifyListeners(); logs.add('Job ${message['filename']} added to local queue'); final job = jobs.firstWhere((item) => item.id == message['jobId']); Printer? printer; for (final candidate in printers) { if (candidate.id == job.printerId || candidate.id == defaultPrinterId) { printer = candidate; break; } } if (printer?.ipAddress != null) { await queue.process(job, 'ipp://${printer!.ipAddress}:631/ipp/print'); jobs..clear()..addAll(await queue.all()); notifyListeners(); } } catch (error) { logs.add('Could not receive job: $error', level: LogLevel.error); } }
  Future<void> refreshPrinters() async { if (!server.isConfigured || printers.isEmpty) return; logs.add('Polling printers'); try { await server.syncPrinters(printers); notifyListeners(); } catch (error) { logs.add('Printer sync failed: $error', level: LogLevel.warning); } }
  Future<void> discoverPrinters() async { try { final found = await discovery.discover(); printers..clear()..addAll(found); await server.syncPrinters(found); logs.add('Discovered ${found.length} printer(s)', level: LogLevel.success); notifyListeners(); } catch (error) { logs.add('Discovery failed: $error', level: LogLevel.error); } }
  Future<void> addManualPrinter(String ip) async { try { final printer = await discovery.addManual(ip); printers.add(printer); await server.syncPrinters(printers); logs.add('Added ${printer.name}', level: LogLevel.success); notifyListeners(); } catch (error) { logs.add('Could not add printer: $error', level: LogLevel.error); } }
  Future<void> testConnection() async { await _connect(); notifyListeners(); }
  void setTab(int value) { tab = value; notifyListeners(); }
  void togglePaused() { paused = !paused; logs.add(paused ? 'Queue paused' : 'Queue resumed'); notifyListeners(); }
  void setDarkMode(bool value) { darkMode = value; notifyListeners(); }
  void setAutoStart(bool value) { autoStart = value; if (value) { _startup.enable(); } else { _startup.disable(); } notifyListeners(); }
  void setPollingInterval(Duration value) { pollingInterval = value; _poller?.cancel(); if (server.isConfigured) _poller = Timer.periodic(value, (_) => refreshPrinters()); notifyListeners(); }
  void setDefaultPrinter(String? value) { defaultPrinterId = value; notifyListeners(); }
  Future<void> retryJob(PrintJob job) async { job.status = JobStatus.pending; job.errorMessage = null; job.updatedAt = DateTime.now(); await queue.update(job); try { await server.reportStatus(job.id, 'queued'); logs.add('Retrying ${job.filename}', level: LogLevel.info); } catch (error) { logs.add('Retry failed: $error', level: LogLevel.error); } notifyListeners(); }
  Future<void> cancelJob(PrintJob job) async { job.status = JobStatus.cancelled; job.updatedAt = DateTime.now(); await queue.update(job); try { await server.reportStatus(job.id, 'cancelled'); logs.add('Cancelled ${job.filename}', level: LogLevel.info); } catch (error) { logs.add('Cancel failed: $error', level: LogLevel.error); } notifyListeners(); }
  Future<void> updateServerUrl(String value) async { server.serverUrl = value.replaceFirst(RegExp(r'/$'), ''); notifyListeners(); }
  Future<void> exportLogs() async { final file = await logs.export(); logs.add('Exported logs to ${file.path}', level: LogLevel.success); notifyListeners(); }
  Future<void> reset() async { socket.disconnect(); await server.clearCredentials(); initialized = true; connected = false; notifyListeners(); }
  @override void dispose() { _poller?.cancel(); _messages?.cancel(); socket.dispose(); queue.dispose(); super.dispose(); }
}

class PrintBridgeApp extends StatelessWidget {
  const PrintBridgeApp({super.key});
  @override Widget build(BuildContext context) => Consumer<AppState>(builder: (_, state, __) => MaterialApp(debugShowCheckedModeBanner: false, title: 'PrintBridge Agent', theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: state.darkMode ? ThemeMode.dark : ThemeMode.light, home: state.initialized && state.server.isConfigured ? const HomeShell() : const SetupScreen()));
}

class HomeShell extends StatefulWidget { const HomeShell({super.key}); @override State<HomeShell> createState() => _HomeShellState(); }
class _HomeShellState extends State<HomeShell> with WindowListener {
  @override void initState() { super.initState(); windowManager.addListener(this); }
  @override void dispose() { windowManager.removeListener(this); super.dispose(); }
  @override Future<void> onWindowClose() async { final state = context.read<AppState>(); if (state.allowQuit) return; await windowManager.hide(); }
  @override Widget build(BuildContext context) { final state = context.watch<AppState>(); const pages = [QueueScreen(), PrintersScreen(), LogsScreen(), SettingsScreen()]; return Scaffold(body: Row(children: [NavRail(selected: state.tab, onSelected: state.setTab), Expanded(child: pages[state.tab])])); }
}
