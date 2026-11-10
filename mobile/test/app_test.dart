import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:stackwork_app/core/api.dart';
import 'package:stackwork_app/core/providers.dart';
import 'package:stackwork_app/main.dart';

import 'package:stackwork_app/core/push.dart';

import 'support/fakes.dart';

/// Подменяет сеть: отдаёт JSON из test/fixtures, снятый с реального API v1
class _FakeAdapter implements HttpClientAdapter {
  final requests = <String>[];
  String? token;

  String _fixture(String name) => File('test/fixtures/$name.json').readAsStringSync();

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? body, Future<void>? cancel) async {
    final path = o.uri.path.replaceFirst('/api/v1', '');
    requests.add('${o.method} $path${o.uri.query.isEmpty ? '' : '?${o.uri.query}'}');
    String json;
    var status = 200;
    if (path == '/vacancies') {
      json = _fixture('vacancies');
    } else if (RegExp(r'^/vacancies/[^/]+$').hasMatch(path)) {
      json = _fixture('vacancy');
    } else if (path == '/skills') {
      json = _fixture('skills');
    } else if (path == '/salaries') {
      json = _fixture('salaries');
    } else if (path.startsWith('/salaries/')) {
      json = _fixture('salary_skill');
    } else if (path.startsWith('/companies/')) {
      json = _fixture('company');
    } else if (path == '/meta') {
      json = _fixture('meta');
    } else if (path == '/auth/login') {
      final b = o.data is Map ? o.data as Map : jsonDecode(o.data as String) as Map;
      if (b['password'] != 'password123') {
        status = 401;
        json = '{"error":{"code":"INVALID_CREDENTIALS","message":"Неверная почта или пароль"}}';
      } else {
        token = 'jwt-test';
        json = '{"token":"jwt-test","user":{"id":"u1","email":"${b['email']}","name":"Тест","role":"CANDIDATE","emailVerified":true}}';
      }
    } else if (path == '/me') {
      if (o.headers['Authorization'] != 'Bearer jwt-test') {
        status = 401;
        json = '{"error":{"code":"UNAUTHORIZED","message":"Нужен вход"}}';
      } else {
        json = '{"user":{"id":"u1","email":"anna@example.com","name":"Тест","role":"CANDIDATE","emailVerified":true},"counts":{"saved":1,"applications":2}}';
      }
    } else if (path == '/me/devices') {
      json = '{"ok":true,"enabled":true}';
    } else if (path == '/me/saved') {
      json = '{"items":[]}';
    } else if (path == '/me/applications') {
      json = '{"items":[]}';
    } else {
      status = 404;
      json = '{"error":{"code":"NOT_FOUND","message":"Нет такого"}}';
    }
    return ResponseBody.fromString(json, status, headers: {Headers.contentTypeHeader: ['application/json']});
  }

  @override
  void close({bool force = false}) {}
}

Future<(ApiClient, _FakeAdapter, FakePushService)> _client() async {
  FlutterSecureStoragePlatform.instance = MemoryStorage();
  final adapter = _FakeAdapter();
  final dio = Dio(BaseOptions(baseUrl: '$apiBase/api/v1'))..httpClientAdapter = adapter;
  final api = ApiClient(dio: dio, storage: const FlutterSecureStorage());
  await api.init();
  return (api, adapter, FakePushService(api));
}

Future<void> _pump(WidgetTester tester, ApiClient api, FakePushService push) async {
  await tester.pumpWidget(ProviderScope(overrides: [apiProvider.overrideWithValue(api), pushProvider.overrideWithValue(push)], child: const StackworkApp()));
  await tester.pumpAndSettle(const Duration(milliseconds: 200));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async => initializeDateFormatting('ru'));

  testWidgets('лента: карточки из API, фильтр по чипу, открытие вакансии и компании', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final (api, adapter, push) = await _client();
    await _pump(tester, api, push);

    expect(find.text('Вакансии'), findsWidgets);
    expect(adapter.requests.where((r) => r.startsWith('GET /vacancies?')).length, 1);
    final first = jsonDecode(File('test/fixtures/vacancies.json').readAsStringSync())['items'][0];
    expect(find.text(first['title'] as String), findsOneWidget);

    // быстрый чип технологии добавляет фильтр skills=
    await tester.tap(find.text('Python').first);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(adapter.requests.last, contains('skills=python'));

    // переход на экран вакансии по тапу на карточку
    await tester.tap(find.text(first['title'] as String).first);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(adapter.requests.any((r) => r == 'GET /vacancies/${first['slug']}'), isTrue);
    final detail = jsonDecode(File('test/fixtures/vacancy.json').readAsStringSync());
    expect(find.text(detail['title'] as String), findsWidgets);
    expect(find.textContaining('Откликнуться'), findsWidgets);

    // компания открывается по названию
    await tester.tap(find.textContaining(detail['company']['name'] as String).last);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(adapter.requests.any((r) => r.startsWith('GET /companies/')), isTrue);
  });

  testWidgets('зарплаты: таблица и детальная страница технологии', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final (api, adapter, push) = await _client();
    await _pump(tester, api, push);

    await tester.tap(find.text('Зарплаты').last);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(adapter.requests.contains('GET /salaries'), isTrue);
    await tester.tap(find.text('Python').first);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(adapter.requests.contains('GET /salaries/python'), isTrue);
    expect(find.textContaining('МЕДИАНА'), findsOneWidget);
  });

  testWidgets('гость видит приглашение войти; вход через API сохраняет токен и показывает профиль', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final (api, adapter, push) = await _client();
    await _pump(tester, api, push);

    await tester.tap(find.text('Профиль').last);
    await tester.pumpAndSettle();
    expect(find.text('Войдите, чтобы откликаться и сохранять вакансии'), findsOneWidget);

    await tester.tap(find.text('Войти').first);
    await tester.pumpAndSettle();
    expect(find.text('Вход в Stackwork'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), 'anna@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'wrong');
    await tester.tap(find.text('Войти').last);
    await tester.pumpAndSettle();
    expect(find.text('Неверная почта или пароль'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Войти').last);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(api.isAuthorized, isTrue);
    expect(adapter.requests.contains('POST /auth/login'), isTrue);
    // после входа приложение включает push для этого пользователя
    expect(push.enabledFor, [true]);
    expect(find.text('Тест'), findsOneWidget);
    expect(find.text('Откликов'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Удалить аккаунт'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Удалить аккаунт'), findsOneWidget);

    // экран удаления аккаунта открывается и требует пароль и галочку
    await tester.tap(find.text('Удалить аккаунт'));
    await tester.pumpAndSettle();
    expect(find.text('Удаление аккаунта'), findsOneWidget);
    expect(find.text('Пароль для подтверждения'.toUpperCase()), findsOneWidget);
  });

  testWidgets('ссылки сайта: /jobs/python/remote открывает ленту с фильтрами, /en/vacancies/<slug> открывает вакансию', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final (api, adapter, push) = await _client();
    await _pump(tester, api, push);
    final router = GoRouter.of(tester.element(find.byType(Scaffold).first));

    router.go('/jobs/python/remote');
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(router.state.uri.toString(), '/?skill=python&format=REMOTE');
    expect(adapter.requests.last, allOf(contains('skills=python'), contains('format=REMOTE')));

    router.go('/en/vacancies/testovaya-vakansiya-mvy8klyv');
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(router.state.uri.path, '/vacancies/testovaya-vakansiya-mvy8klyv');
  });

  testWidgets('push: нажатие ведёт в профиль, уведомление при открытом приложении показывает баннер', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final (api, adapter, push) = await _client();
    await _pump(tester, api, push);

    push.openedController.add(const PushTarget('/profile'));
    await tester.pumpAndSettle();
    expect(find.text('Войдите, чтобы откликаться и сохранять вакансии'), findsOneWidget);

    push.foregroundController.add(const ForegroundPush(title: 'Квант Банк: Собеседование', body: 'Созвон в четверг в 15:00', target: PushTarget('/profile')));
    await tester.pumpAndSettle();
    expect(find.text('Квант Банк: Собеседование'), findsOneWidget);
    expect(find.text('Созвон в четверг в 15:00'), findsOneWidget);
    expect(find.text('Открыть'), findsOneWidget);
    expect(adapter.requests.isNotEmpty, isTrue);
  });
}
