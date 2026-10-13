import 'package:flutter/material.dart';

/// Токены дизайна — 1:1 из frontend/app/globals.css.
class T {
  static const brand = Color(0xFF2563EB);
  static const brandDark = Color(0xFF1D4ED8);
  static const brandLight = Color(0x1A2563EB);
  static const brandGlow = Color(0x402563EB);
  static const price = Color(0xFF16A34A);
  static const favorite = Color(0xFFEF4444);
  static const text = Color(0xFF111827);
  static const muted = Color(0xFF6B7280);
  static const mutedLight = Color(0xFF9CA3AF);
  static const bg = Color(0xFFF8F9FB);
  static const card = Colors.white;
  static const line = Color(0xFFE5E7EB);
  static const soft = Color(0xFFF6F7FB);

  static const rXs = 8.0;
  static const rSm = 12.0;
  static const r = 16.0;
  static const rLg = 20.0;
  static const rXl = 28.0;

  static const shadowXs = [BoxShadow(color: Color(0x0D000000), blurRadius: 3, offset: Offset(0, 1))];
  static const shadowSm = [BoxShadow(color: Color(0x12000000), blurRadius: 8, offset: Offset(0, 2))];
  static const shadow = [BoxShadow(color: Color(0x17000000), blurRadius: 20, offset: Offset(0, 4))];
  static const shadowLg = [BoxShadow(color: Color(0x24000000), blurRadius: 48, offset: Offset(0, 16))];
  static const brandShadow = [BoxShadow(color: brandGlow, blurRadius: 16, offset: Offset(0, 4))];

  static BoxDecoration cardDecoration({double radius = rLg, List<BoxShadow> shadow = T.shadow}) =>
      BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: line),
        boxShadow: shadow,
      );

  static const h1 = TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5, height: 1.1, color: text);
  static const h2 = TextStyle(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3, color: text);
  static const mutedText = TextStyle(fontSize: 13, color: muted);
}

ThemeData buildTheme() {
  final inputBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(T.rSm),
    borderSide: const BorderSide(color: T.line, width: 1.5),
  );
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: T.bg,
    colorScheme: ColorScheme.fromSeed(seedColor: T.brand, primary: T.brand, surface: T.bg),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xF2F8F9FB),
      foregroundColor: T.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontFamily: 'Inter', fontSize: 17, fontWeight: FontWeight.w700, color: T.text),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      hintStyle: const TextStyle(color: T.mutedLight, fontSize: 14),
      labelStyle: const TextStyle(color: T.muted, fontSize: 14),
      border: inputBorder,
      enabledBorder: inputBorder,
      focusedBorder: inputBorder.copyWith(borderSide: const BorderSide(color: T.brand, width: 1.5)),
      errorBorder: inputBorder.copyWith(borderSide: const BorderSide(color: T.favorite, width: 1.5)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: T.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 46),
        textStyle: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: T.text,
        backgroundColor: Colors.white,
        minimumSize: const Size(0, 44),
        side: const BorderSide(color: T.line),
        textStyle: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
    ),
    dividerColor: T.line,
  );
}
