import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 磐石烤地瓜品牌主題：溫暖大地色，呼應炭火窯烤與古早味。
class AppTheme {
  AppTheme._();

  // 品牌色票
  static const Color ember = Color(0xFFC2410C); // 炭火橘（主色）
  static const Color emberDark = Color(0xFF9A3412);
  static const Color honey = Color(0xFFE8A33D); // 蜜糖金（強調）
  static const Color cream = Color(0xFFFBF6EE); // 米白背景
  static const Color charcoal = Color(0xFF2A211B); // 深焙咖啡（文字）
  static const Color clay = Color(0xFF6B5848); // 陶土棕（次要文字）
  static const Color surface = Color(0xFFFFFDF9);
  static const Color success = Color(0xFF2E7D32);

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: ember,
        primary: ember,
        secondary: honey,
        surface: surface,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: cream,
    );

    final textTheme = GoogleFonts.notoSansTcTextTheme(base.textTheme).apply(
      bodyColor: charcoal,
      displayColor: charcoal,
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: cream,
        foregroundColor: charcoal,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: charcoal.withValues(alpha: 0.06)),
        ),
        clipBehavior: Clip.antiAlias,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ember,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.notoSansTc(
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: emberDark,
          side: const BorderSide(color: ember),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: charcoal.withValues(alpha: 0.15)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: charcoal.withValues(alpha: 0.15)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ember, width: 1.6),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: honey.withValues(alpha: 0.18),
        labelStyle: GoogleFonts.notoSansTc(
          color: emberDark,
          fontWeight: FontWeight.w600,
        ),
        side: BorderSide.none,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: charcoal,
        contentTextStyle: GoogleFonts.notoSansTc(color: Colors.white),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
