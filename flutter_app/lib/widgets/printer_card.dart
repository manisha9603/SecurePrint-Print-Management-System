import 'package:flutter/material.dart';
import '../models/printer.dart';
import '../theme/app_theme.dart';
import 'status_pill.dart';
class PrinterCard extends StatelessWidget { final Printer printer; const PrinterCard(this.printer, {super.key}); @override Widget build(BuildContext context) => Card(child: ListTile(leading: const Icon(Icons.print_outlined, color: AppTheme.green), title: Text(printer.name), subtitle: Text('${printer.ipAddress ?? 'No address'}\n${printer.capabilities.take(3).join('  •  ')}', maxLines: 2), isThreeLine: true, trailing: StatusPill(printer.status))); }
