import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../widgets/soft.dart';

/// Профиль: счётчики, отклики, ссылки, выход и удаление аккаунта
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _open(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final meta = ref.watch(metaProvider).value;
    final privacy = meta?.privacyUrl ?? '$apiBase/privacy';
    final terms = meta?.termsUrl ?? '$apiBase/terms';
    final telegram = meta?.telegramChannel ?? 'https://t.me/stackworkjobs';

    if (session == null) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              Text('Профиль', style: Soft.style(size: 26, weight: 800, height: 1.15, letterSpacing: -0.5)),
              const SizedBox(height: 4),
              Text('Войдите, чтобы откликаться и сохранять вакансии', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
              const SizedBox(height: 22),
              PrimaryButton(label: 'Войти', onPressed: () => context.push('/login')),
              const SizedBox(height: 12),
              SoftButton(label: 'Зарегистрироваться', onPressed: () => context.push('/register')),
              const SizedBox(height: 28),
              _Links(telegram: telegram, privacy: privacy, terms: terms, onOpen: _open),
              const SizedBox(height: 20),
              const _Version(),
            ],
          ),
        ),
      );
    }

    final profile = ref.watch(profileProvider);
    final applications = ref.watch(applicationsProvider);
    final counts = profile.value;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: Soft.blue,
          onRefresh: () async {
            ref.invalidate(profileProvider);
            ref.invalidate(applicationsProvider);
            await ref.read(sessionProvider.notifier).refresh();
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(18), boxShadow: Soft.raised(8)),
                    alignment: Alignment.center,
                    child: Text(session.initial, style: Soft.style(size: 24, weight: 800, color: Soft.blue)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(session.displayName, style: Soft.style(size: 22, weight: 800, letterSpacing: -0.3), maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text('${session.email} · ${session.isCandidate ? 'соискатель' : session.role == 'EMPLOYER' ? 'работодатель' : 'администратор'}', style: Soft.style(size: 13, weight: 600, color: Soft.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                ],
              ),
              if (!session.emailVerified) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Почта не подтверждена', style: Soft.style(size: 14, weight: 800, color: const Color(0xFF8A4B00))),
                      const SizedBox(height: 4),
                      Text('Без подтверждения нельзя откликаться. Откройте ссылку из письма.', style: Soft.style(size: 13, weight: 600, color: const Color(0xFF8A4B00), height: 1.4)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          SoftButton(
                            label: 'Отправить письмо',
                            height: 40,
                            onPressed: () async {
                              try {
                                await ref.read(apiProvider).resendVerification();
                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Письмо отправлено')));
                              } on ApiException catch (e) {
                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                              }
                            },
                          ),
                          const SizedBox(width: 10),
                          SoftButton(label: 'Проверить', height: 40, color: Soft.blue, onPressed: () => ref.read(sessionProvider.notifier).refresh()),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(child: _Counter(value: counts?.applicationsCount, label: 'Откликов')),
                  const SizedBox(width: 12),
                  Expanded(child: _Counter(value: counts?.savedCount, label: 'Сохранено', onTap: () => context.go('/saved'))),
                ],
              ),
              const SizedBox(height: 22),
              const SectionLabel('Мои отклики'),
              const SizedBox(height: 10),
              applications.when(
                loading: () => const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(color: Soft.blue))),
                error: (e, _) => Text(e is ApiException ? e.message : 'Не удалось загрузить отклики', style: Soft.style(size: 13, weight: 600, color: Soft.muted)),
                data: (items) => items.isEmpty
                    ? SoftCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Пока ни одного отклика', style: Soft.style(size: 15, weight: 800)),
                            const SizedBox(height: 4),
                            Text('Откликайтесь на вакансии работодателей Stackwork прямо из приложения, ответы будут здесь.', style: Soft.style(size: 13, weight: 600, color: Soft.muted, height: 1.4)),
                          ],
                        ),
                      )
                    : Column(
                        children: [
                          for (final a in items) ...[
                            SoftCard(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                              onTap: () => context.push('/vacancies/${a.vacancy.slug}'),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(a.vacancy.title, style: Soft.style(size: 15, weight: 800), maxLines: 2, overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 2),
                                        Text('${a.vacancy.company.name} · ${fmtDate(a.createdAt)}', style: Soft.style(size: 12, weight: 600, color: Soft.muted)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  _StatusChip(status: a.status, label: a.statusLabel),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                          ],
                        ],
                      ),
              ),
              const SizedBox(height: 14),
              _Links(telegram: telegram, privacy: privacy, terms: terms, onOpen: _open),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: SoftButton(
                      label: 'Выйти',
                      onPressed: () async {
                        await ref.read(sessionProvider.notifier).logout();
                        if (context.mounted) context.go('/');
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: SoftButton(label: 'Удалить аккаунт', color: Soft.danger, onPressed: () => context.push('/profile/delete'))),
                ],
              ),
              const SizedBox(height: 20),
              const _Version(),
            ],
          ),
        ),
      ),
    );
  }
}

class _Counter extends StatelessWidget {
  const _Counter({required this.value, required this.label, this.onTap});
  final int? value;
  final String label;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    return SoftCard(
      padding: const EdgeInsets.all(14),
      radius: 18,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value == null ? '…' : fmtNumber(value!), style: Soft.style(size: 22, weight: 600, color: Soft.blue, mono: true)),
          const SizedBox(height: 4),
          Text(label, style: Soft.style(size: 12, weight: 700, color: Soft.muted)),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.label});
  final String status;
  final String label;
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      'VIEWED' => (const Color(0xFFE7F0FB), const Color(0xFF1F4E8A)),
      'INTERVIEW' => (const Color(0xFFEAF7EF), const Color(0xFF1F6F58)),
      'OFFER' => (const Color(0xFFDCE8FF), Soft.blueDark),
      'REJECTED' => (const Color(0xFFFBEDED), const Color(0xFF8A1F1F)),
      _ => (Soft.bgRaised, Soft.text),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: Soft.style(size: 12, weight: 700, color: fg)),
    );
  }
}

class _Links extends StatelessWidget {
  const _Links({required this.telegram, required this.privacy, required this.terms, required this.onOpen});
  final String telegram;
  final String privacy;
  final String terms;
  final Future<void> Function(String) onOpen;

  @override
  Widget build(BuildContext context) {
    Widget row(String label, IconData icon, VoidCallback onTap, {bool last = false}) => Column(
          children: [
            InkWell(
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(children: [Expanded(child: Text(label, style: Soft.style(size: 14, weight: 700))), Icon(icon, size: 18, color: Soft.muted)]),
              ),
            ),
            if (!last) const Divider(height: 1, indent: 16, endIndent: 16),
          ],
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel('О сервисе'),
        const SizedBox(height: 10),
        SoftCard(
          padding: EdgeInsets.zero,
          radius: 20,
          child: Column(
            children: [
              row('Сайт stackworkjobs.vercel.app', Icons.open_in_new_rounded, () => onOpen(apiBase)),
              row('Telegram-канал @stackworkjobs', Icons.open_in_new_rounded, () => onOpen(telegram)),
              row('Политика конфиденциальности', Icons.open_in_new_rounded, () => onOpen(privacy)),
              row('Пользовательское соглашение', Icons.open_in_new_rounded, () => onOpen(terms), last: true),
            ],
          ),
        ),
      ],
    );
  }
}

class _Version extends StatelessWidget {
  const _Version();
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PackageInfo>(
      future: PackageInfo.fromPlatform(),
      builder: (_, snap) => Center(child: Text(snap.hasData ? 'Stackwork ${snap.data!.version} (${snap.data!.buildNumber})' : '', style: Soft.style(size: 12, weight: 600, color: Soft.muted))),
    );
  }
}
