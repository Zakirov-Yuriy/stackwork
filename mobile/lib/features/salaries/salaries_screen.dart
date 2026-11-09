import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';

/// Зарплаты по стеку: переключатель валюты, полосы 25–75 процентиль с медианой
class SalariesScreen extends ConsumerStatefulWidget {
  const SalariesScreen({super.key});
  @override
  ConsumerState<SalariesScreen> createState() => _SalariesScreenState();
}

class _SalariesScreenState extends ConsumerState<SalariesScreen> {
  int _currency = 0; // 0 рубли, 1 доллары

  @override
  Widget build(BuildContext context) {
    final tables = ref.watch(salariesProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: Soft.blue,
          onRefresh: () => ref.refresh(salariesProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Зарплаты по стеку', style: Soft.style(size: 26, weight: 800, height: 1.15, letterSpacing: -0.5)),
                      const SizedBox(height: 4),
                      Text('Медиана и типичный диапазон по опубликованным вакансиям', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
                      const SizedBox(height: 16),
                      SoftSegments(items: const ['Рубли, в месяц', 'Доллары, в год'], selected: _currency, onSelected: (i) => setState(() => _currency = i)),
                      const SizedBox(height: 18),
                    ],
                  ),
                ),
              ),
              ...tables.when(
                loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: Soft.blue)))],
                error: (e, _) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: StatusView(icon: Icons.cloud_off_rounded, title: 'Не удалось загрузить', text: e is ApiException ? e.message : null, actionLabel: 'Повторить', onAction: () => ref.invalidate(salariesProvider)),
                  ),
                ],
                data: (t) {
                  final rows = _currency == 0 ? t.rub : t.usd;
                  final max = rows.fold<int>(1, (m, r) => r.to > m ? r.to : m);
                  final currency = _currency == 0 ? 'RUB' : 'USD';
                  final period = _currency == 0 ? 'MONTH' : 'YEAR';
                  if (rows.isEmpty) return [const SliverFillRemaining(hasScrollBody: false, child: StatusView(title: 'Пока мало данных', text: 'Вакансий с зарплатой в этой валюте меньше пяти.'))];
                  return [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      sliver: SliverList.separated(
                        itemCount: rows.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _SalaryRowCard(row: rows[i], max: max, currency: currency, period: period),
                      ),
                    ),
                  ];
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SalaryRowCard extends StatelessWidget {
  const _SalaryRowCard({required this.row, required this.max, required this.currency, required this.period});
  final SalaryRow row;
  final int max;
  final String currency;
  final String period;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      radius: 20,
      onTap: () => context.push('/salaries/${row.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(row.name, style: Soft.style(size: 16, weight: 600, mono: true), maxLines: 1, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 10),
              Text('${fmtNumber(row.median)} ${sign(currency)}', style: Soft.style(size: 16, weight: 600, color: Soft.blue, mono: true)),
            ],
          ),
          const SizedBox(height: 10),
          RangeBar(from: row.from, to: row.to, median: row.median, max: max),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: Text('${fmtNumber(row.from)} – ${fmtNumber(row.to)} ${sign(currency)}${period == 'YEAR' ? ' в год' : ''}', style: Soft.style(size: 12, weight: 700, color: Soft.muted), maxLines: 1, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 10),
              Text(fmtVacancies(row.count), style: Soft.style(size: 12, weight: 700, color: Soft.muted)),
            ],
          ),
        ],
      ),
    );
  }
}

/// Полоса диапазона на утопленной подложке с меткой медианы
class RangeBar extends StatelessWidget {
  const RangeBar({super.key, required this.from, required this.to, required this.median, required this.max, this.height = 12});
  final int from;
  final int to;
  final int median;
  final int max;
  final double height;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final left = (from / max).clamp(0.0, 1.0) * w;
        final width = ((to - from) / max).clamp(0.02, 1.0) * w;
        final mid = (median / max).clamp(0.0, 1.0) * w;
        return SizedBox(
          height: height + 6,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(top: 3, left: 0, right: 0, child: SoftInset(padding: EdgeInsets.zero, radius: height / 2, child: SizedBox(height: height))),
              Positioned(top: 3, left: left, width: width, child: Container(height: height, decoration: BoxDecoration(gradient: Soft.primaryGradient, borderRadius: BorderRadius.circular(height / 2)))),
              Positioned(top: 0, left: (mid - 1.5).clamp(0.0, w - 3), child: Container(width: 3, height: height + 6, decoration: BoxDecoration(color: Soft.text, borderRadius: BorderRadius.circular(2)))),
            ],
          ),
        );
      },
    );
  }
}
