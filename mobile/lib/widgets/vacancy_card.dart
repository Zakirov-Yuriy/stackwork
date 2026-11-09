import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/api.dart';
import '../models/models.dart';
import '../core/format.dart';
import '../core/providers.dart';
import '../core/theme.dart';
import 'soft.dart';

/// Карточка вакансии как на сайте: логотип, должность, компания и место, зарплата, стек
class VacancyCard extends ConsumerWidget {
  const VacancyCard({super.key, required this.vacancy, this.showSkills = true});
  final Vacancy vacancy;
  final bool showSkills;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final v = vacancy;
    final saved = ref.watch(savedProvider.select((s) => (s.value ?? const []).any((x) => x.id == v.id))) || v.saved;
    return SoftCard(
      padding: const EdgeInsets.all(16),
      onTap: () => context.push('/vacancies/${v.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CompanyMark(initials: v.company.initials, logoUrl: v.company.logoUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(v.title, style: Soft.style(size: 16, weight: 800, height: 1.2), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 3),
                    Text('${v.company.name} · ${v.location}', style: Soft.style(size: 13, weight: 600, color: Soft.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              SaveToggle(vacancy: v, saved: saved),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Flexible(
                child: Text(
                  v.salary.isSet ? v.salary.formatted : 'Зарплата не указана',
                  style: Soft.style(size: 15, weight: 600, color: v.salary.isSet ? Soft.blue : Soft.muted, mono: true),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 10),
              Flexible(child: Text('${v.gradeLabel} · ${v.workFormatLabel}', style: Soft.style(size: 12, weight: 700, color: Soft.muted), maxLines: 1, overflow: TextOverflow.ellipsis)),
            ],
          ),
          if (showSkills && v.skills.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final s in v.skills.take(4)) SoftChip(label: s.name, flat: true),
                if (v.skills.length > 4) SoftChip(label: '+${v.skills.length - 4}', flat: true),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Закладка: сохранить или убрать; гостя ведёт на вход
class SaveToggle extends ConsumerWidget {
  const SaveToggle({super.key, required this.vacancy, required this.saved, this.size = 36});
  final Vacancy vacancy;
  final bool saved;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: size,
      height: size,
      child: IconButton(
        padding: EdgeInsets.zero,
        tooltip: saved ? 'Убрать из сохранённых' : 'Сохранить',
        icon: Icon(saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded, color: saved ? Soft.blue : Soft.muted, size: 22),
        onPressed: () async {
          try {
            final ok = await ref.read(savedProvider.notifier).toggle(vacancy);
            if (!ok && context.mounted) {
              context.push('/login?next=${Uri.encodeComponent('/vacancies/${vacancy.slug}')}');
            }
          } on ApiException catch (e) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
          }
        },
      ),
    );
  }
}

/// Пустая карточка на время загрузки
class VacancyCardSkeleton extends StatelessWidget {
  const VacancyCardSkeleton({super.key});
  @override
  Widget build(BuildContext context) {
    Widget bar(double w, double h) => Container(width: w, height: h, decoration: BoxDecoration(color: Soft.dark.withValues(alpha: 0.45), borderRadius: BorderRadius.circular(h / 2)));
    return SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [bar(44, 44), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [bar(200, 14), const SizedBox(height: 8), bar(140, 11)]))]),
          const SizedBox(height: 14),
          bar(160, 14),
          const SizedBox(height: 12),
          Row(children: [bar(60, 24), const SizedBox(width: 6), bar(80, 24), const SizedBox(width: 6), bar(50, 24)]),
        ],
      ),
    );
  }
}

/// Текст «4 312 вакансий»
String totalLabel(int total) => fmtVacancies(total);
