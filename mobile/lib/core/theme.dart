import 'package:flutter/material.dart';

/// Цвета и типографика сайта (globals.css: --soft-*), один в один.
class Soft {
  Soft._();

  static const bg = Color(0xFFE8EBF0);
  static const bgRaised = Color(0xFFF1F3F7);
  static const dark = Color(0xFFC6CBD4); // тень снизу-справа
  static const light = Color(0xFFFFFFFF); // блик сверху-слева
  static const text = Color(0xFF2B3140);
  static const muted = Color(0xFF6B7280);
  static const blue = Color(0xFF3B6FD9);
  static const blue2 = Color(0xFF5A8DF2);
  static const blueDark = Color(0xFF2D62D0);
  static const danger = Color(0xFFB42318);
  static const divider = Color(0xFFD8DCE3);

  static const primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [blue2, blueDark],
  );

  /// Выпуклая тень (карточки, кнопки)
  static List<BoxShadow> raised([double d = 10]) => [
        BoxShadow(color: dark, offset: Offset(d, d), blurRadius: d * 2.4),
        BoxShadow(color: light, offset: Offset(-d, -d), blurRadius: d * 2.4),
      ];

  static const sans = 'Manrope';
  static const mono = 'JetBrainsMono';

  /// Manrope это вариативный шрифт: вес задаём и FontWeight, и осью wght.
  static TextStyle style({
    double size = 14,
    int weight = 600,
    Color color = text,
    double? height,
    double? letterSpacing,
    bool mono = false,
  }) {
    return TextStyle(
      fontFamily: mono ? Soft.mono : sans,
      fontSize: size,
      fontWeight: _weight(weight),
      fontVariations: [FontVariation('wght', weight.toDouble())],
      color: color,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  static FontWeight _weight(int w) {
    if (w >= 800) return FontWeight.w800;
    if (w >= 700) return FontWeight.w700;
    if (w >= 600) return FontWeight.w600;
    return FontWeight.w500;
  }

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: bg,
      colorScheme: ColorScheme.fromSeed(seedColor: blue, brightness: Brightness.light).copyWith(
        primary: blue,
        surface: bg,
        onSurface: text,
        error: danger,
      ),
      fontFamily: sans,
      splashFactory: InkSparkle.splashFactory,
    );
    return base.copyWith(
      textTheme: base.textTheme.apply(bodyColor: text, displayColor: text, fontFamily: sans),
      appBarTheme: const AppBarTheme(backgroundColor: bg, foregroundColor: text, elevation: 0, scrolledUnderElevation: 0, centerTitle: false),
      dividerColor: divider,
      textSelectionTheme: const TextSelectionThemeData(cursorColor: blue, selectionHandleColor: blue),
      inputDecorationTheme: const InputDecorationTheme(border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.zero),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: text,
        contentTextStyle: style(size: 14, weight: 600, color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(backgroundColor: bg, surfaceTintColor: Colors.transparent),
      pageTransitionsTheme: const PageTransitionsTheme(builders: {TargetPlatform.android: PredictiveBackPageTransitionsBuilder()}),
    );
  }
}
