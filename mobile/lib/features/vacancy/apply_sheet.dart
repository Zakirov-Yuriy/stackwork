import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';

/// Отклик на вакансию работодателя Stackwork: письмо, ссылки на GitHub и резюме
Future<void> showApplySheet(BuildContext context, Vacancy vacancy) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Soft.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
    builder: (_) => _ApplySheet(vacancy: vacancy),
  );
}

class _ApplySheet extends ConsumerStatefulWidget {
  const _ApplySheet({required this.vacancy});
  final Vacancy vacancy;
  @override
  ConsumerState<_ApplySheet> createState() => _ApplySheetState();
}

class _ApplySheetState extends ConsumerState<_ApplySheet> {
  final _letter = TextEditingController();
  final _github = TextEditingController();
  final _resume = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _letter.dispose();
    _github.dispose();
    _resume.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).apply(widget.vacancy.slug, coverLetter: _letter.text.trim(), githubUrl: _github.text.trim(), resumeUrl: _resume.text.trim());
      ref.invalidate(applicationsProvider);
      ref.invalidate(profileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Отклик отправлен. Ответ работодателя придёт на почту и в раздел «Отклики».')));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider);
    final unverified = user != null && !user.emailVerified;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: Soft.dark, borderRadius: BorderRadius.circular(3)))),
            const SizedBox(height: 16),
            Text('Отклик', style: Soft.style(size: 22, weight: 800)),
            const SizedBox(height: 4),
            Text('${widget.vacancy.title} · ${widget.vacancy.company.name}', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
            const SizedBox(height: 18),
            if (unverified) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Сначала подтвердите почту', style: Soft.style(size: 14, weight: 800, color: const Color(0xFF8A4B00))),
                    const SizedBox(height: 4),
                    Text('Мы отправили письмо на ${user.email}. Откройте ссылку из него и вернитесь к отклику.', style: Soft.style(size: 13, weight: 600, color: const Color(0xFF8A4B00), height: 1.4)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        SoftButton(
                          label: 'Отправить письмо ещё раз',
                          height: 42,
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
                        SoftButton(label: 'Я подтвердил', height: 42, color: Soft.blue, onPressed: () => ref.read(sessionProvider.notifier).refresh()),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            const SectionLabel('Сопроводительное письмо'),
            const SizedBox(height: 8),
            SoftField(controller: _letter, hint: 'Пара слов о себе и почему интересна вакансия', maxLines: 5),
            const SizedBox(height: 14),
            const SectionLabel('GitHub'),
            const SizedBox(height: 8),
            SoftField(controller: _github, hint: 'https://github.com/имя', keyboardType: TextInputType.url),
            const SizedBox(height: 14),
            const SectionLabel('Ссылка на резюме'),
            const SizedBox(height: 8),
            SoftField(controller: _resume, hint: 'https://…', keyboardType: TextInputType.url),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: Soft.style(size: 13, weight: 700, color: Soft.danger)),
            ],
            const SizedBox(height: 18),
            PrimaryButton(label: 'Отправить отклик', icon: Icons.send_rounded, loading: _sending, onPressed: unverified ? null : _send),
          ],
        ),
      ),
    );
  }
}
