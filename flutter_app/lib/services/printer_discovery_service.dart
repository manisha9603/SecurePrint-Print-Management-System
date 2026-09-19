import 'dart:async';
import 'package:multicast_dns/multicast_dns.dart';
import '../models/printer.dart';
import 'ipp_service.dart';

class PrinterDiscoveryService {
  static const pollingInterval = Duration(seconds: 10);
  final IppService ipp;
  PrinterDiscoveryService(this.ipp);
  Future<List<Printer>> discover() async { final client = MDnsClient(); final found = <String, Printer>{}; try { await client.start(); await for (final ptr in client.lookup<PtrResourceRecord>(ResourceRecordQuery.serverPointer('_ipp._tcp'))) { await for (final record in client.lookup<SrvResourceRecord>(ResourceRecordQuery.service(ptr.domainName))) { final host = record.target; final address = await client.lookup<IPAddressResourceRecord>(ResourceRecordQuery.addressIPv4(host)).first; final id = '${address.address.address}:${record.port}'; final uri = 'ipp://${address.address.address}:${record.port}/'; final attributes = await ipp.getPrinterAttributes(Uri.parse(uri)); found[id] = Printer(id: id, name: attributes['printer-name'] ?? ptr.domainName, ipAddress: address.address.address, status: 'online', capabilities: attributes.keys.toList()); } } } finally { client.stop(); } return found.values.toList(); }
  Future<Printer> addManual(String ip, {int port = 631, String resource = '/ipp/print'}) async { final uri = Uri.parse('ipp://$ip:$port$resource'); final attributes = await ipp.getPrinterAttributes(uri); return Printer(id: '$ip:$port', name: attributes['printer-name'] ?? ip, ipAddress: ip, status: 'online', capabilities: attributes.keys.toList()); }
}
