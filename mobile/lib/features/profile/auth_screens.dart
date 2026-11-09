import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../widgets/soft.dart';

/// Общий каркас экранов входа и регистрации: кнопка назад, знак S, заголовок, форма
class _AuthScaffold extends StatelessWidget {
  const _AuthScaffold({required this.title, required this.subtitle, required this.fields, required this.footer});
  final String title;
  final String subtitle;
  final List<Widget> fields;
  final List<Widget> footer;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
              child: Row(children: [SoftIconButton(icon: Icons.arrow_back_ios_new_rounded, tooltip: 'Назад', onPressed: () => context.canPop() ? context.pop() : context.go('/'))]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                children: [
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(26), boxShadow: Soft.raised(12)),
                      alignment: Alignment.center,
                      child: Text('S', style: Soft.style(size: 46, weight: 800, color: Soft.blue)),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(title, textAlign: TextAlign.center, style: Soft.style(size: 26, weight: 800, letterSpacing: -0.5)),
                  const SizedBox(height: 6),
                  Text(subtitle, textAlign: TextAlign.center, style: Soft.style(size: 14, weight: 600, color: Soft.muted, height: 1.45)),
                  const SizedBox(height: 32),
                  ...fields,
                  const SizedBox(height: 28),
                  ...footer,
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.next});
  final String? next;
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _show = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).login(_email.text.trim(), _password.text);
      if (!mounted) return;
      final next = widget.next;
      if (next != null && next.startsWith('/')) {
        context.go(next);
      } else {
        context.go('/profile');
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScaffold(
      title: 'Вход в Stackwork',
      subtitle: 'Тот же аккаунт, что на сайте: отклики и сохранённые синхронизируются.',
      fields: [
        const SectionLabel('Почта'),
        const SizedBox(height: 6),
        SoftField(controller: _email, hint: 'you@example.com', keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.next),
        const SizedBox(height: 14),
        const SectionLabel('Пароль'),
        const SizedBox(height: 6),
        SoftField(
          controller: _password,
          hint: '••••••••',
          obscure: !_show,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submit(),
          trailing: IconButton(icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: Soft.muted), tooltip: _show ? 'Скрыть пароль' : 'Показать пароль', onPressed: () => setState(() => _show = !_show)),
        ),
        const SizedBox(height: 10),
        Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => context.push('/forgot'), child: Text('Забыли пароль?', style: Soft.style(size: 13, weight: 700, color: Soft.blue)))),
        if (_error != null) ...[Text(_error!, style: Soft.style(size: 13, weight: 700, color: Soft.danger)), const SizedBox(height: 10)],
        PrimaryButton(label: 'Войти', loading: _busy, onPressed: _submit),
      ],
      footer: [
        Center(
          child: TextButton(
            onPressed: () => context.push('/register${widget.next != null ? '?next=${Uri.encodeComponent(widget.next!)}' : ''}'),
            child: RichText(
              text: TextSpan(style: Soft.style(size: 14, weight: 700), children: [const TextSpan(text: 'Нет аккаунта? '), TextSpan(text: 'Зарегистрироваться', style: Soft.style(size: 14, weight: 700, color: Soft.blue))]),
            ),
          ),
        ),
        Center(child: TextButton(onPressed: () => context.go('/'), child: Text('Смотреть вакансии без входа', style: Soft.style(size: 14, weight: 700, color: Soft.muted)))),
      ],
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.next});
  final String? next;
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _consent = false;
  bool _show = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_consent) {
      setState(() => _error = 'Нужно согласие с условиями и политикой конфиденциальности');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).register(name: _name.text.trim(), email: _email.text.trim(), password: _password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Аккаунт создан. Письмо для подтверждения почты уже в пути.')));
      final next = widget.next;
      context.go(next != null && next.startsWith('/') ? next : '/profile');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final meta = ref.watch(metaProvider).value;
    return _AuthScaffold(
      title: 'Регистрация',
      subtitle: 'Для соискателей. Работодатели размещают вакансии через сайт.',
      fields: [
        const SectionLabel('Имя'),
        const SizedBox(height: 6),
        SoftField(controller: _name, hint: 'Как к вам обращаться', autofillHints: const [AutofillHints.name], textInputAction: TextInputAction.next),
        const SizedBox(height: 14),
        const SectionLabel('Почта'),
        const SizedBox(height: 6),
        SoftField(controller: _email, hint: 'you@example.com', keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.next),
        const SizedBox(height: 14),
        const SectionLabel('Пароль'),
        const SizedBox(height: 6),
        SoftField(
          controller: _password,
          hint: 'Не короче 8 символов',
          obscure: !_show,
          autofillHints: const [AutofillHints.newPassword],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submit(),
          trailing: IconButton(icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: Soft.muted), tooltip: _show ? 'Скрыть пароль' : 'Показать пароль', onPressed: () => setState(() => _show = !_show)),
        ),
        const SizedBox(height: 14),
        InkWell(
          onTap: () => setState(() => _consent = !_consent),
          borderRadius: BorderRadius.circular(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(value: _consent, onChanged: (v) => setState(() => _consent = v ?? false), activeColor: Soft.blue),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Wrap(
                    children: [
                      Text('Согласен с ', style: Soft.style(size: 13, weight: 600, color: Soft.muted)),
                      GestureDetector(onTap: () => launchUrl(Uri.parse(meta?.termsUrl ?? '$apiBase/terms'), mode: LaunchMode.externalApplication), child: Text('условиями', style: Soft.style(size: 13, weight: 700, color: Soft.blue))),
                      Text(' и ', style: Soft.style(size: 13, weight: 600, color: Soft.muted)),
                      GestureDetector(onTap: () => launchUrl(Uri.parse(meta?.privacyUrl ?? '$apiBase/privacy'), mode: LaunchMode.externalApplication), child: Text('политикой конфиденциальности', style: Soft.style(size: 13, weight: 700, color: Soft.blue))),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: Soft.style(size: 13, weight: 700, color: Soft.danger)), const SizedBox(height: 10)] else const SizedBox(height: 10),
        PrimaryButton(label: 'Создать аккаунт', loading: _busy, onPressed: _submit),
      ],
      footer: [
        Center(
          child: TextButton(
            onPressed: () => context.canPop() ? context.pop() : context.go('/login'),
            child: RichText(text: TextSpan(style: Soft.style(size: 14, weight: 700), children: [const TextSpan(text: 'Уже есть аккаунт? '), TextSpan(text: 'Войти', style: Soft.style(size: 14, weight: 700, color: Soft.blue))])),
          ),
        ),
      ],
    );
  }
}

class ForgotScreen extends ConsumerStatefulWidget {
  const ForgotScreen({super.key});
  @override
  ConsumerState<ForgotScreen> createState() => _ForgotScreenState();
}

class _ForgotScreenState extends ConsumerState<ForgotScreen> {
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).forgot(_email.text.trim());
      setState(() => _sent = true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScaffold(
      title: 'Сброс пароля',
      subtitle: 'Пришлём ссылку на почту. Новый пароль задаётся на сайте, потом входите здесь.',
      fields: [
        if (_sent)
          SoftCard(child: Text('Если адрес ${_email.text.trim()} зарегистрирован, письмо уже отправлено. Проверьте папку «Спам».', style: Soft.style(size: 14, weight: 600, height: 1.45)))
        else ...[
          const SectionLabel('Почта'),
          const SizedBox(height: 6),
          SoftField(controller: _email, hint: 'you@example.com', keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.done, onSubmitted: (_) => _submit()),
          if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: Soft.style(size: 13, weight: 700, color: Soft.danger))],
          const SizedBox(height: 18),
          PrimaryButton(label: 'Отправить ссылку', loading: _busy, onPressed: _submit),
        ],
      ],
      footer: [Center(child: TextButton(onPressed: () => context.canPop() ? context.pop() : context.go('/login'), child: Text('Вернуться ко входу', style: Soft.style(size: 14, weight: 700, color: Soft.muted))))],
    );
  }
}

/// Удаление аккаунта с подтверждением паролем (требование Google Play)
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});
  @override
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _password = TextEditingController();
  bool _confirm = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).deleteAccount(_password.text);
      if (!mounted) return;
      context.go('/');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Аккаунт удалён')));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider);
    return _AuthScaffold(
      title: 'Удаление аккаунта',
      subtitle: 'Аккаунт ${user?.email ?? ''} будет удалён без возможности восстановления.',
      fields: [
        SoftCard(
          child: Text('Удаляются профиль, отклики на вакансии, сохранённые вакансии и все одноразовые ссылки из писем. Работодатели перестанут видеть ваши отклики. Данные удаляются сразу, резервные копии базы очищаются в течение 30 дней.', style: Soft.style(size: 14, weight: 600, height: 1.45)),
        ),
        const SizedBox(height: 18),
        const SectionLabel('Пароль для подтверждения'),
        const SizedBox(height: 6),
        SoftField(controller: _password, hint: '••••••••', obscure: true, autofillHints: const [AutofillHints.password]),
        const SizedBox(height: 12),
        InkWell(
          onTap: () => setState(() => _confirm = !_confirm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(value: _confirm, onChanged: (v) => setState(() => _confirm = v ?? false), activeColor: Soft.danger),
              Expanded(child: Padding(padding: const EdgeInsets.only(top: 12), child: Text('Понимаю, что аккаунт и все данные будут удалены безвозвратно', style: Soft.style(size: 13, weight: 600)))),
            ],
          ),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: Soft.style(size: 13, weight: 700, color: Soft.danger))],
        const SizedBox(height: 16),
        SoftButton(label: _busy ? 'Удаляем…' : 'Удалить аккаунт', color: Soft.danger, height: 54, onPressed: _confirm && !_busy ? _submit : null),
      ],
      footer: [Center(child: TextButton(onPressed: () => context.pop(), child: Text('Отмена', style: Soft.style(size: 14, weight: 700, color: Soft.muted))))],
    );
  }
}
