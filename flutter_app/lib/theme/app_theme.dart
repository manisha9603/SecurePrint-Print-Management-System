import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const green = Color(0xFF00D97E); static const amber = Color(0xFFF5A623); static const red = Color(0xFFE5484D); static const darkBg = Color(0xFF0F1216); static const lightBg = Color(0xFFF2F5F4);
  static ThemeData dark() => _theme(Brightness.dark, darkBg, const Color(0xFF171C22), const Color(0xFFF0F3F2));
  static ThemeData light() => _theme(Brightness.light, lightBg, Colors.white, const Color(0xFF18201F));
  static ThemeData _theme(Brightness brightness, Color background, Color surface, Color text) { final base = ThemeData(useMaterial3: true, brightness: brightness, scaffoldBackgroundColor: background, colorScheme: ColorScheme.fromSeed(seedColor: green, brightness: brightness, surface: surface)); return base.copyWith(textTheme: GoogleFonts.manropeTextTheme(base.textTheme).apply(bodyColor: text, displayColor: text), inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: brightness == Brightness.dark ? const Color(0xFF1D242B) : const Color(0xFFE8EEEB), border: const OutlineInputBorder(borderSide: BorderSide.none)), cardTheme: CardThemeData(color: surface, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), appBarTheme: const AppBarTheme(centerTitle: false, backgroundColor: Colors.transparent)); }
}
