import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/api.dart';
import 'core/providers.dart';
import 'core/theme.dart';
import 'features/company/company_screen.dart';
import 'features/profile/auth_screens.dart';
import 'features/profile/profile_screen.dart';
import 'features/profile/saved_screen.dart';
import 'features/salaries/salaries_screen.dart';
import 'features/salaries/salary_detail_screen.dart';
import 'features/vacancies/feed_screen.dart';
import 'features/vacancy/vacancy_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ru');
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Soft.bg,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  final api = ApiClient();
  await api.init();
  runApp(ProviderScope(overrides: [apiProvider.overrideWithValue(api)], child: const StackworkApp()));
}

final _rootKey = GlobalKey<NavigatorState>();

/// Маршруты повторяют адреса сайта, чтобы ссылки stackworkjobs.vercel.app открывались в приложении
GoRouter _buildRouter(ApiClient api) {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    redirect: (context, state) {
      var path = state.uri.path;
      // английская версия сайта ведёт на те же экраны
      if (path == '/en' || path.startsWith('/en/')) {
        path = path.substring(3);
        if (path.isEmpty) path = '/';
        return Uri(path: path, queryParameters: state.uri.queryParameters.isEmpty ? null : state.uri.queryParameters).toString();
      }
      // посадочные /jobs/<skill>[/remote|/<город>] открывают ленту с фильтром
      if (path == '/jobs' || path == '/jobs/') return '/';
      final jobs = RegExp(r'^/jobs/([^/]+)(?:/([^/]+))?/?$').firstMatch(path);
      if (jobs != null) {
        final q = <String, String>{'skill': jobs.group(1)!};
        if (jobs.group(2) == 'remote') q['format'] = 'REMOTE';
        return Uri(path: '/', queryParameters: q).toString();
      }
      if (path == '/vacancies' || path == '/vacancies/') return '/';
      if (path == '/profile/delete' && !api.isAuthorized) return '/login?next=${Uri.encodeComponent('/profile/delete')}';
      return null;
    },
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _Shell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => _FeedEntry(skill: state.uri.queryParameters['skill'], format: state.uri.queryParameters['format'], query: state.uri.queryParameters['q']),
            ),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/salaries', builder: (context, state) => const SalariesScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/saved', builder: (context, state) => const SavedScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen())]),
        ],
      ),
      GoRoute(parentNavigatorKey: _rootKey, path: '/vacancies/:slug', builder: (context, state) => VacancyScreen(slug: state.pathParameters['slug']!)),
      GoRoute(parentNavigatorKey: _rootKey, path: '/companies/:slug', builder: (context, state) => CompanyScreen(slug: state.pathParameters['slug']!)),
      GoRoute(parentNavigatorKey: _rootKey, path: '/salaries/:slug', builder: (context, state) => SalaryDetailScreen(slug: state.pathParameters['slug']!)),
      GoRoute(parentNavigatorKey: _rootKey, path: '/login', builder: (context, state) => LoginScreen(next: state.uri.queryParameters['next'])),
      GoRoute(parentNavigatorKey: _rootKey, path: '/register', builder: (context, state) => RegisterScreen(next: state.uri.queryParameters['next'])),
      GoRoute(parentNavigatorKey: _rootKey, path: '/forgot', builder: (context, state) => const ForgotScreen()),
      GoRoute(parentNavigatorKey: _rootKey, path: '/profile/delete', builder: (context, state) => const DeleteAccountScreen()),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Такой страницы нет', style: Soft.style(size: 20, weight: 800)),
                const SizedBox(height: 8),
                Text(state.uri.toString(), style: Soft.style(size: 13, weight: 600, color: Soft.muted, mono: true), textAlign: TextAlign.center),
                const SizedBox(height: 20),
                FilledButton(onPressed: () => context.go('/'), child: const Text('К вакансиям')),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class StackworkApp extends ConsumerStatefulWidget {
  const StackworkApp({super.key});
  @override
  ConsumerState<StackworkApp> createState() => _StackworkAppState();
}

class _StackworkAppState extends ConsumerState<StackworkApp> {
  late final GoRouter _router = _buildRouter(ref.read(apiProvider));

  @override
  void initState() {
    super.initState();
    // Токен уже прочитан из защищённого хранилища; проверяем его на сервере в фоне
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(sessionProvider.notifier).restore());
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Stackwork',
      debugShowCheckedModeBanner: false,
      theme: Soft.theme(),
      routerConfig: _router,
      locale: const Locale('ru'),
      supportedLocales: const [Locale('ru'), Locale('en')],
      localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    );
  }
}

/// Лента с фильтром из адреса (/?skill=python&format=REMOTE), например из ссылки на посадочную страницу
class _FeedEntry extends ConsumerStatefulWidget {
  const _FeedEntry({this.skill, this.format, this.query});
  final String? skill;
  final String? format;
  final String? query;
  @override
  ConsumerState<_FeedEntry> createState() => _FeedEntryState();
}

class _FeedEntryState extends ConsumerState<_FeedEntry> {
  @override
  void initState() {
    super.initState();
    _apply();
  }

  @override
  void didUpdateWidget(covariant _FeedEntry old) {
    super.didUpdateWidget(old);
    if (old.skill != widget.skill || old.format != widget.format || old.query != widget.query) _apply();
  }

  void _apply() {
    if (widget.skill == null && widget.format == null && widget.query == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final current = ref.read(filtersProvider);
      ref.read(filtersProvider.notifier).set(current.copyWith(
            skills: widget.skill != null ? {widget.skill!} : current.skills,
            formats: widget.format != null ? {widget.format!} : current.formats,
            query: widget.query ?? current.query,
          ));
    });
  }

  @override
  Widget build(BuildContext context) => const FeedScreen();
}

/// Нижняя навигация: парящая полупрозрачная плашка со скруглёнными углами и размытием,
/// лента прокручивается под ней (extendBody), активная вкладка подсвечена синим знаком
class _Shell extends StatelessWidget {
  const _Shell({required this.shell});
  final StatefulNavigationShell shell;

  static const _tabs = [
    (Icons.work_outline_rounded, Icons.work_rounded, 'Вакансии'),
    (Icons.payments_outlined, Icons.payments_rounded, 'Зарплаты'),
    (Icons.bookmark_border_rounded, Icons.bookmark_rounded, 'Сохранённые'),
    (Icons.person_outline_rounded, Icons.person_rounded, 'Профиль'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Scaffold(
      extendBody: true,
      body: shell,
      bottomNavigationBar: Padding(
        padding: EdgeInsets.fromLTRB(14, 0, 14, bottom > 0 ? bottom + 6 : 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Soft.bg.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white.withValues(alpha: 0.65), width: 1),
                boxShadow: [
                  BoxShadow(color: Soft.dark.withValues(alpha: 0.55), blurRadius: 24, offset: const Offset(0, 10)),
                  BoxShadow(color: Colors.white.withValues(alpha: 0.7), blurRadius: 12, offset: const Offset(0, -4)),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                child: Row(
                  children: [
                    for (var i = 0; i < _tabs.length; i++)
                      Expanded(
                        child: _Tab(
                          icon: shell.currentIndex == i ? _tabs[i].$2 : _tabs[i].$1,
                          label: _tabs[i].$3,
                          active: shell.currentIndex == i,
                          onTap: () => shell.goBranch(i, initialLocation: i == shell.currentIndex),
                        ),
                      ),
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

class _Tab extends StatelessWidget {
  const _Tab({required this.icon, required this.label, required this.active, required this.onTap});
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: active,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                width: 48,
                height: 32,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: active ? Soft.primaryGradient : null,
                  boxShadow: active ? [BoxShadow(color: Soft.blue.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4))] : null,
                ),
                child: Icon(icon, size: 21, color: active ? Colors.white : Soft.muted),
              ),
              const SizedBox(height: 4),
              Text(label, style: Soft.style(size: 11, weight: active ? 800 : 700, color: active ? Soft.text : Soft.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}
