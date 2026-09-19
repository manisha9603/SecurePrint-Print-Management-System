import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
class ConnectionIndicator extends StatelessWidget { final bool connected; const ConnectionIndicator({required this.connected, super.key}); @override Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 8, height: 8, decoration: BoxDecoration(color: connected ? AppTheme.green : AppTheme.red, shape: BoxShape.circle)), const SizedBox(width: 8), Text(connected ? 'Connected' : 'Offline', style: TextStyle(color: connected ? AppTheme.green : AppTheme.red, fontSize: 12))]); }
