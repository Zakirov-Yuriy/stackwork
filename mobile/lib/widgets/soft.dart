import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Выпуклая карточка (как .neu-card на сайте)
class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.radius = 22, this.onTap, this.depth = 10});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final double depth;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(radius), boxShadow: Soft.raised(depth)),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(radius),
        clipBehavior: Clip.antiAlias,
        child: onTap == null ? Padding(padding: padding, child: child) : InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      ),
    );
    return box;
  }
}

/// Утопленный блок (поле ввода, подложка, .neu-inset)
class SoftInset extends StatelessWidget {
  const SoftInset({super.key, required this.child, this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12), this.radius = 16});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    // Внутренняя тень рисуем двумя слоями: тёмный край сверху-слева и светлый снизу-справа
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Container(
        decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(radius)),
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(radius),
                  gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFD9DDE4), Soft.bg, Soft.bg, Color(0xFFF7F8FA)], stops: [0, 0.18, 0.82, 1]),
                ),
              ),
            ),
            Padding(padding: padding, child: child),
          ],
        ),
      ),
    );
  }
}

/// Главная кнопка с градиентом (.neu-primary)
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, this.onPressed, this.icon, this.height = 56, this.loading = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final double height;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return Opacity(
      opacity: enabled ? 1 : 0.6,
      child: Container(
        height: height,
        decoration: BoxDecoration(gradient: Soft.primaryGradient, borderRadius: BorderRadius.circular(16), boxShadow: enabled ? Soft.raised(7) : null),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: enabled ? onPressed : null,
            child: Center(
              child: loading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(child: Text(label, style: Soft.style(size: 16, weight: 800, color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center)),
                          if (icon != null) ...[const SizedBox(width: 8), Icon(icon, size: 18, color: Colors.white)],
                        ],
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Обычная выпуклая кнопка (.neu-btn)
class SoftButton extends StatelessWidget {
  const SoftButton({super.key, required this.label, this.onPressed, this.color = Soft.text, this.height = 50, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final Color color;
  final double height;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(14), boxShadow: Soft.raised(6)),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[Icon(icon, size: 18, color: color), const SizedBox(width: 8)],
                Flexible(child: Text(label, style: Soft.style(size: 14, weight: 800, color: color), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Квадратная кнопка-иконка 44×44 (назад, поделиться, сохранить)
class SoftIconButton extends StatelessWidget {
  const SoftIconButton({super.key, required this.icon, required this.onPressed, required this.tooltip, this.active = false, this.color, this.size = 44});
  final IconData icon;
  final VoidCallback? onPressed;
  final String tooltip;
  final bool active;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final child = Container(
      width: size,
      height: size,
      decoration: active ? null : BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(14), boxShadow: Soft.raised(6)),
      child: active
          ? SoftInset(padding: EdgeInsets.zero, radius: 14, child: Center(child: Icon(icon, size: 20, color: color ?? Soft.blue)))
          : Center(child: Icon(icon, size: 20, color: color ?? Soft.text)),
    );
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onPressed, child: child),
      ),
    );
  }
}

/// Чипс-фильтр: выпуклый, активный с синим градиентом
class SoftChip extends StatelessWidget {
  const SoftChip({super.key, required this.label, this.active = false, this.onTap, this.flat = false});
  final String label;
  final bool active;
  final VoidCallback? onTap;
  /// Плоский чипс стека внутри карточки (.chip-flat)
  final bool flat;

  @override
  Widget build(BuildContext context) {
    final decoration = active
        ? BoxDecoration(gradient: Soft.primaryGradient, borderRadius: BorderRadius.circular(999), boxShadow: const [BoxShadow(color: Soft.dark, offset: Offset(4, 4), blurRadius: 10)])
        : flat
            ? BoxDecoration(color: Soft.bgRaised, borderRadius: BorderRadius.circular(999))
            : BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(999), boxShadow: Soft.raised(4));
    final text = Text(label, style: Soft.style(size: flat ? 12 : 13, weight: 700, color: active ? Colors.white : Soft.text));
    // Align с widthFactor: чипс занимает ширину текста, а не всю доступную (важно внутри Wrap)
    final body = Container(
      height: flat ? 28 : 36,
      padding: EdgeInsets.symmetric(horizontal: flat ? 10 : 14),
      decoration: decoration,
      child: Align(widthFactor: 1, child: text),
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(borderRadius: BorderRadius.circular(999), onTap: onTap, child: body),
    );
  }
}

/// Переключатель сегментов (.neu-tabs): утопленная подложка, активный сегмент выпуклый
class SoftSegments extends StatelessWidget {
  const SoftSegments({super.key, required this.items, required this.selected, required this.onSelected});
  final List<String> items;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SoftInset(
      padding: const EdgeInsets.all(5),
      radius: 16,
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onSelected(i),
                child: Container(
                  height: 40,
                  margin: EdgeInsets.only(right: i == items.length - 1 ? 0 : 6),
                  decoration: i == selected ? BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(12), boxShadow: Soft.raised(4)) : null,
                  alignment: Alignment.center,
                  child: Text(items[i], style: Soft.style(size: 13, weight: i == selected ? 800 : 700, color: i == selected ? Soft.text : Soft.muted), textAlign: TextAlign.center),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Плитка с инициалами компании или логотипом
class CompanyMark extends StatelessWidget {
  const CompanyMark({super.key, required this.initials, this.logoUrl, this.size = 44, this.inset = true});
  final String initials;
  final String? logoUrl;
  final double size;
  final bool inset;

  @override
  Widget build(BuildContext context) {
    final content = logoUrl != null && logoUrl!.isNotEmpty
        ? Padding(
            padding: EdgeInsets.all(size * 0.14),
            child: Image.network(logoUrl!, fit: BoxFit.contain, errorBuilder: (_, _, _) => _initials()),
          )
        : _initials();
    final radius = size * 0.28;
    if (inset) return SizedBox(width: size, height: size, child: SoftInset(padding: EdgeInsets.zero, radius: radius, child: Center(child: content)));
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(radius), boxShadow: Soft.raised(size * 0.12)),
      child: Center(child: content),
    );
  }

  Widget _initials() => Text(initials.toUpperCase(), style: Soft.style(size: size * 0.4, weight: 800, color: Soft.blue));
}

/// Подпись раздела капсом (.uppercase tracking)
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: Soft.style(size: 12, weight: 800, color: Soft.muted, letterSpacing: 1));
}

/// Поле ввода в утопленной подложке
class SoftField extends StatelessWidget {
  const SoftField({super.key, required this.controller, this.hint, this.icon, this.obscure = false, this.keyboardType, this.onSubmitted, this.trailing, this.autofillHints, this.textInputAction, this.maxLines = 1, this.autofocus = false});
  final TextEditingController controller;
  final String? hint;
  final IconData? icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmitted;
  final Widget? trailing;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final int maxLines;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return SoftInset(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: maxLines > 1 ? 12 : 0),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: maxLines > 1 ? 0 : 52),
        child: Row(
          crossAxisAlignment: maxLines > 1 ? CrossAxisAlignment.start : CrossAxisAlignment.center,
          children: [
            if (icon != null) ...[Icon(icon, size: 18, color: Soft.muted), const SizedBox(width: 10)],
            Expanded(
              child: TextField(
                controller: controller,
                obscureText: obscure,
                keyboardType: keyboardType,
                onSubmitted: onSubmitted,
                autofillHints: autofillHints,
                textInputAction: textInputAction,
                maxLines: maxLines,
                autofocus: autofocus,
                style: Soft.style(size: 15, weight: 600),
                decoration: InputDecoration(hintText: hint, hintStyle: Soft.style(size: 15, weight: 600, color: Soft.muted), border: InputBorder.none, isCollapsed: maxLines == 1),
              ),
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}

/// Пустое состояние или ошибка с кнопкой
class StatusView extends StatelessWidget {
  const StatusView({super.key, required this.title, this.text, this.actionLabel, this.onAction, this.icon = Icons.search_off_rounded});
  final String title;
  final String? text;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: Soft.muted),
            const SizedBox(height: 14),
            Text(title, style: Soft.style(size: 18, weight: 800), textAlign: TextAlign.center),
            if (text != null) ...[const SizedBox(height: 6), Text(text!, style: Soft.style(size: 14, weight: 600, color: Soft.muted, height: 1.45), textAlign: TextAlign.center)],
            if (actionLabel != null) ...[const SizedBox(height: 18), SizedBox(width: 220, child: PrimaryButton(label: actionLabel!, onPressed: onAction, height: 50))],
          ],
        ),
      ),
    );
  }
}
