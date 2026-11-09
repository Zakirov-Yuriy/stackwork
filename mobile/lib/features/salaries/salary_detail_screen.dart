import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';
import '../../widgets/vacancy_card.dart';
import 'salaries_screen.dart';

const _gradeLabel = {'JUNIOR': 'Junior', 'MIDDLE': 'Middle', 'SENIOR': 'Senior', 'LEAD': 'Lead'};

/// Зарплаты по одной технологии: медиана, по грейдам, удалённо и в офисе, динамика, топ вилок
class SalaryDetailScreen extends ConsumerWidget {
  const SalaryDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(salaryBySkillProvider(slug));
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(children: [SoftIconButton(icon: Icons.arrow_back_ios_new_rounded, tooltip: 'Назад', onPressed: () => context.canPop() ? context.pop() : context.go('/salaries'))]),
            ),
            Expanded(
              child: data.when(
                loading: () => const Center(child: CircularProgressIndicator(color: Soft.blue)),
                error: (e, _) => StatusView(
                  icon: Icons.cloud_off_rounded,
                  title: e is ApiException && e.status == 404 ? 'Мало данных по этой технологии' : 'Не удалось загрузить',
                  text: e is ApiException ? e.message : null,
                  actionLabel: 'Повторить',
                  onAction: () => ref.invalidate(salaryBySkillProvider(slug)),
                ),
                data: (d) => _Body(d: d),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.d});
  final SalaryBreakdown d;

  @override
  Widget build(BuildContext context) {
    final s = d.salary;
    final period = s.period == 'YEAR' ? 'в год' : 'в месяц';
    final max = [s.p75, ...d.byGrade.map((g) => g.value?.p75 ?? 0), d.remoteStat?.p75 ?? 0, d.officeStat?.p75 ?? 0].fold<int>(1, (m, v) => v > m ? v : m);
    final trendMax = d.trend.fold<int>(1, (m, t) => (t.median ?? 0) > m ? t.median! : m);

    return ListView(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 28 + MediaQuery.paddingOf(context).bottom),
      children: [
        Text('Зарплаты ${d.skill.name}', style: Soft.style(size: 26, weight: 800, height: 1.15, letterSpacing: -0.5)),
        const SizedBox(height: 4),
        Text('По ${fmtVacancies(s.count)} с указанной зарплатой. Середина вилки, $period.', style: Soft.style(size: 14, weight: 600, color: Soft.muted, height: 1.4)),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(child: _Stat(label: 'Медиана', value: '${fmtNumber(s.median)} ${sign(s.currency)}', sub: period, accent: true)),
            const SizedBox(width: 12),
            Expanded(child: _Stat(label: 'Диапазон', value: '${fmtNumber(s.p25)} – ${fmtNumber(s.p75)}', sub: '25–75 процентиль')),
          ],
        ),
        if (d.salaryAlt != null) ...[
          const SizedBox(height: 12),
          _Stat(label: 'В другой валюте', value: '${fmtNumber(d.salaryAlt!.median)} ${sign(d.salaryAlt!.currency)}', sub: '${d.salaryAlt!.period == 'YEAR' ? 'в год' : 'в месяц'} · ${fmtVacancies(d.salaryAlt!.count)}'),
        ],
        const SizedBox(height: 22),
        const SectionLabel('По грейдам'),
        const SizedBox(height: 12),
        SoftCard(
          radius: 20,
          child: Column(
            children: [for (final g in d.byGrade) _BarRow(label: _gradeLabel[g.key] ?? g.key, stat: g.value, max: max, currency: s.currency)],
          ),
        ),
        const SizedBox(height: 20),
        const SectionLabel('Удалённо и в офисе'),
        const SizedBox(height: 12),
        SoftCard(
          radius: 20,
          child: Column(children: [_BarRow(label: 'Удалённо', stat: d.remoteStat, max: max, currency: s.currency), _BarRow(label: 'Офис и гибрид', stat: d.officeStat, max: max, currency: s.currency)]),
        ),
        const SizedBox(height: 20),
        const SectionLabel('Динамика за полгода'),
        const SizedBox(height: 12),
        SoftCard(
          radius: 20,
          child: SizedBox(
            height: 150,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final t in d.trend)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(t.median != null ? _short(t.median!) : '—', style: Soft.style(size: 10, weight: 600, color: t.median != null ? Soft.text : Soft.muted, mono: true)),
                          const SizedBox(height: 4),
                          Container(
                            height: t.median != null ? (6 + 90 * t.median! / trendMax) : 0,
                            decoration: BoxDecoration(gradient: Soft.primaryGradient, borderRadius: const BorderRadius.vertical(top: Radius.circular(8))),
                          ),
                          const SizedBox(height: 6),
                          Text(fmtMonth(t.month), style: Soft.style(size: 11, weight: 600, color: Soft.muted)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Все вакансии ${d.skill.name} (${fmtNumber(d.total)})', height: 52, onPressed: () => context.go('/?skill=${d.skill.slug}')),
        if (d.topPaid.isNotEmpty) ...[
          const SizedBox(height: 22),
          const SectionLabel('Самые высокие вилки'),
          const SizedBox(height: 12),
          for (final v in d.topPaid) ...[VacancyCard(vacancy: v, showSkills: false), const SizedBox(height: 12)],
        ],
        if (d.related.isNotEmpty) ...[
          const SizedBox(height: 10),
          const SectionLabel('Смежные технологии'),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final r in d.related) SoftChip(label: '${r.name}${r.count != null ? ' · ${r.count}' : ''}', onTap: () => context.push('/salaries/${r.slug}'))]),
        ],
        const SizedBox(height: 16),
        Text('Берём опубликованные вакансии с технологией ${d.skill.name} и указанной вилкой, для каждой середину вилки, затем медиану и процентили. Вакансии в других валютах не входят. Обновляется каждый час.', style: Soft.style(size: 12, weight: 600, color: Soft.muted, height: 1.45)),
      ],
    );
  }

  String _short(int v) => v >= 1000000 ? '${(v / 1000000).toStringAsFixed(1)}M' : v >= 1000 ? '${(v / 1000).round()}k' : '$v';
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.sub, this.accent = false});
  final String label;
  final String value;
  final String sub;
  final bool accent;
  @override
  Widget build(BuildContext context) {
    return SoftCard(
      padding: const EdgeInsets.all(16),
      radius: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionLabel(label),
          const SizedBox(height: 6),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: Soft.style(size: 22, weight: 600, color: accent ? Soft.blue : Soft.text, mono: true))),
          const SizedBox(height: 2),
          Text(sub, style: Soft.style(size: 12, weight: 600, color: Soft.muted)),
        ],
      ),
    );
  }
}

class _BarRow extends StatelessWidget {
  const _BarRow({required this.label, required this.stat, required this.max, required this.currency});
  final String label;
  final SalaryStat? stat;
  final int max;
  final String currency;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(width: 96, child: Text(label, style: Soft.style(size: 14, weight: 700))),
          Expanded(child: stat == null ? SoftInset(padding: EdgeInsets.zero, radius: 6, child: const SizedBox(height: 12)) : RangeBar(from: stat!.p25, to: stat!.p75, median: stat!.median, max: max)),
          const SizedBox(width: 12),
          SizedBox(
            width: 92,
            child: Text(stat == null ? '—' : '${fmtNumber(stat!.median)} ${sign(currency)}', textAlign: TextAlign.right, style: Soft.style(size: 12, weight: 600, color: stat == null ? Soft.muted : Soft.text, mono: true), maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
