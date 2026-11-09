import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';
import '../../widgets/vacancy_card.dart';
import 'apply_sheet.dart';

/// Страница вакансии: шапка с действиями, зарплата, стек, описание, похожие, кнопка отклика
class VacancyScreen extends ConsumerWidget {
  const VacancyScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(vacancyDetailProvider(slug));
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: detail.when(
          loading: () => const Center(child: CircularProgressIndicator(color: Soft.blue)),
          error: (e, _) => Column(
            children: [
              _TopBar(onBack: () => context.pop()),
              Expanded(
                child: StatusView(
                  icon: Icons.cloud_off_rounded,
                  title: e is ApiException && e.status == 404 ? 'Вакансия не найдена' : 'Не удалось загрузить',
                  text: e is ApiException ? e.message : null,
                  actionLabel: 'Повторить',
                  onAction: () => ref.invalidate(vacancyDetailProvider(slug)),
                ),
              ),
            ],
          ),
          data: (d) => _Body(detail: d),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onBack, this.actions = const []});
  final VoidCallback onBack;
  final List<Widget> actions;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: [
          SoftIconButton(icon: Icons.arrow_back_ios_new_rounded, tooltip: 'Назад', onPressed: onBack),
          const Spacer(),
          for (final a in actions) ...[a, const SizedBox(width: 10)],
        ],
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.detail});
  final VacancyDetail detail;

  Future<void> _share(BuildContext context) async {
    final v = detail.vacancy;
    final url = '$apiBase/vacancies/${v.slug}';
    final salary = v.salary.isSet ? ', ${v.salary.formatted}' : '';
    await SharePlus.instance.share(ShareParams(text: '${v.title}, ${v.company.name}$salary\n$url', subject: v.title));
  }

  Future<void> _apply(BuildContext context, WidgetRef ref) async {
    final v = detail.vacancy;
    if (!v.isInternal) {
      // Импортированная вакансия: отклик на сайте источника, переход считается через /apply на нашем сайте
      final uri = Uri.parse('$apiBase/apply/${v.slug}?from=app');
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Не удалось открыть ссылку')));
      }
      return;
    }
    final session = ref.read(sessionProvider);
    if (session == null) {
      context.push('/login?next=${Uri.encodeComponent('/vacancies/${v.slug}')}');
      return;
    }
    if (!context.mounted) return;
    await showApplySheet(context, v);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final v = detail.vacancy;
    final saved = ref.watch(savedProvider.select((s) => (s.value ?? const []).any((x) => x.id == v.id))) || v.saved;
    final html = detail.descriptionHtml;
    final sectionTitles = const {'aboutTeam': 'О команде', 'responsibilities': 'Что делать', 'requirements': 'Что нужно', 'niceToHave': 'Будет плюсом', 'conditions': 'Условия'};

    return Column(
      children: [
        _TopBar(
          onBack: () => context.canPop() ? context.pop() : context.go('/'),
          actions: [
            SoftIconButton(icon: Icons.ios_share_rounded, tooltip: 'Поделиться', onPressed: () => _share(context)),
            SoftIconButton(
              icon: saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
              tooltip: saved ? 'Убрать из сохранённых' : 'Сохранить',
              active: saved,
              onPressed: () async {
                try {
                  final ok = await ref.read(savedProvider.notifier).toggle(v);
                  if (!ok && context.mounted) context.push('/login?next=${Uri.encodeComponent('/vacancies/${v.slug}')}');
                } on ApiException catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                }
              },
            ),
          ],
        ),
        Expanded(
          child: ListView(
            padding: EdgeInsets.fromLTRB(20, 20, 20, detail.closed ? 24 + MediaQuery.paddingOf(context).bottom : 24),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CompanyMark(initials: v.company.initials, logoUrl: v.company.logoUrl, size: 64, inset: false),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(v.title, style: Soft.style(size: 22, weight: 800, height: 1.2, letterSpacing: -0.3)),
                        const SizedBox(height: 4),
                        GestureDetector(
                          onTap: () => context.push('/companies/${v.company.slug}'),
                          child: Text('${v.company.name} · ${v.location}${v.publishedAt != null ? ' · ${fmtAgo(v.publishedAt)}' : ''}', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (detail.closed) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFFFBEDED), borderRadius: BorderRadius.circular(16)),
                  child: Text('Вакансия закрыта. Ниже похожие открытые вакансии.', style: Soft.style(size: 14, weight: 700, color: const Color(0xFF8A1F1F))),
                ),
              ],
              const SizedBox(height: 18),
              SoftInset(
                padding: const EdgeInsets.all(16),
                radius: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(v.salary.isSet ? v.salary.formatted : 'Зарплата не указана', style: Soft.style(size: 20, weight: 600, color: v.salary.isSet ? Soft.blue : Soft.muted, mono: true)),
                    if (v.salary.type != null && v.salary.isSet && v.salary.currency == 'RUB') ...[
                      const SizedBox(height: 2),
                      Text(v.salary.type == 'NET' ? 'на руки' : v.salary.type == 'GROSS' ? 'до вычета налогов' : '', style: Soft.style(size: 12, weight: 600, color: Soft.muted)),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        SoftChip(label: v.gradeLabel),
                        SoftChip(label: v.workFormatLabel),
                        if (v.employmentLabel.isNotEmpty) SoftChip(label: v.employmentLabel),
                        if (v.experienceLabel.isNotEmpty) SoftChip(label: v.experienceLabel),
                        if (v.language == 'en') const SoftChip(label: 'Английский'),
                      ],
                    ),
                  ],
                ),
              ),
              if (v.skills.isNotEmpty) ...[
                const SizedBox(height: 18),
                const SectionLabel('Стек'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [for (final s in v.skills) SoftChip(label: s.name, flat: true, onTap: () => context.push('/salaries/${s.slug}'))],
                ),
              ],
              const SizedBox(height: 18),
              Text('О вакансии', style: Soft.style(size: 17, weight: 800)),
              const SizedBox(height: 8),
              if (detail.sections.isNotEmpty)
                for (final e in detail.sections.entries) ...[
                  Text(sectionTitles[e.key] ?? e.key, style: Soft.style(size: 14, weight: 800)),
                  const SizedBox(height: 4),
                  _Html(e.value),
                  const SizedBox(height: 10),
                ]
              else if (html != null)
                _Html(html)
              else
                Text('Описание на сайте работодателя.', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
              if (v.sourceLabel != null && !v.isInternal) ...[
                const SizedBox(height: 10),
                Text('Источник: ${v.sourceLabel}', style: Soft.style(size: 12, weight: 600, color: Soft.muted)),
              ],
              if (detail.similar.isNotEmpty) ...[
                const SizedBox(height: 22),
                const SectionLabel('Похожие вакансии'),
                const SizedBox(height: 10),
                for (final s in detail.similar) ...[VacancyCard(vacancy: s, showSkills: false), const SizedBox(height: 12)],
              ],
            ],
          ),
        ),
        if (!detail.closed)
          Container(
            padding: EdgeInsets.fromLTRB(20, 14, 20, 14 + MediaQuery.of(context).padding.bottom),
            decoration: const BoxDecoration(color: Soft.bg, boxShadow: [BoxShadow(color: Color(0x8CC6CBD4), offset: Offset(0, -10), blurRadius: 24)]),
            child: PrimaryButton(label: 'Откликнуться', icon: v.isInternal ? Icons.send_rounded : Icons.open_in_new_rounded, onPressed: () => _apply(context, ref)),
          ),
      ],
    );
  }
}

class _Html extends StatelessWidget {
  const _Html(this.html);
  final String html;
  @override
  Widget build(BuildContext context) {
    return HtmlWidget(
      html,
      textStyle: Soft.style(size: 14, weight: 500, height: 1.55),
      customStylesBuilder: (el) {
        if (el.localName == 'h2' || el.localName == 'h3' || el.localName == 'h4') return {'font-size': '15px', 'font-weight': '800', 'margin': '12px 0 4px'};
        if (el.localName == 'a') return {'color': '#3b6fd9', 'text-decoration': 'none'};
        if (el.localName == 'li') return {'margin': '0 0 4px'};
        return null;
      },
      onTapUrl: (url) async => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
    );
  }
}
