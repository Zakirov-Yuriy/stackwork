import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../widgets/soft.dart';
import '../../widgets/vacancy_card.dart';

/// Компания: описание и открытые вакансии
class CompanyScreen extends ConsumerWidget {
  const CompanyScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(companyProvider(slug));
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(children: [SoftIconButton(icon: Icons.arrow_back_ios_new_rounded, tooltip: 'Назад', onPressed: () => context.canPop() ? context.pop() : context.go('/'))]),
            ),
            Expanded(
              child: data.when(
                loading: () => const Center(child: CircularProgressIndicator(color: Soft.blue)),
                error: (e, _) => StatusView(icon: Icons.cloud_off_rounded, title: 'Не удалось загрузить', text: e is ApiException ? e.message : null, actionLabel: 'Повторить', onAction: () => ref.invalidate(companyProvider(slug))),
                data: (d) => ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CompanyMark(initials: d.company.ref.initials, logoUrl: d.company.ref.logoUrl, size: 64, inset: false),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(d.company.ref.name, style: Soft.style(size: 22, weight: 800, height: 1.2)),
                              const SizedBox(height: 4),
                              Text([d.company.industry, d.company.city].whereType<String>().join(' · '), style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (d.company.description != null) ...[
                      const SizedBox(height: 16),
                      Text(d.company.description!, style: Soft.style(size: 14, weight: 500, height: 1.55)),
                    ],
                    if (d.company.website != null) ...[
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: () => launchUrl(Uri.parse(d.company.website!), mode: LaunchMode.externalApplication),
                        child: Text(d.company.website!.replaceFirst(RegExp(r'^https?://'), ''), style: Soft.style(size: 14, weight: 700, color: Soft.blue)),
                      ),
                    ],
                    const SizedBox(height: 22),
                    Text(fmtVacancies(d.vacancies.length), style: Soft.style(size: 18, weight: 800)),
                    const SizedBox(height: 12),
                    for (final v in d.vacancies) ...[VacancyCard(vacancy: v), const SizedBox(height: 14)],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
