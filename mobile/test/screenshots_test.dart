// Снимки экранов для визуальной проверки, не golden-тест. Запуск вручную:
//   flutter test --dart-define=SCREENSHOTS=true --update-goldens test/screenshots_test.dart
// Результат в test/goldens/*.png (в git не попадает). Иконки в тестах не рисуются, только макет и текст.
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:stackwork_app/core/api.dart';
import 'package:stackwork_app/core/providers.dart';
import 'package:stackwork_app/main.dart';

import 'support/fakes.dart';

class _FakeAdapter implements HttpClientAdapter {
  String _fixture(String name) => File('test/fixtures/$name.json').readAsStringSync();
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? body, Future<void>? cancel) async {
    final path = o.uri.path.replaceFirst('/api/v1', '');
    String json;
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
    } else if (path == '/meta') {
      json = _fixture('meta');
    } else if (path == '/me') {
      json = '{"user":{"id":"u1","email":"anna@example.com","name":"Анна","role":"CANDIDATE","emailVerified":true},"counts":{"saved":1,"applications":2}}';
    } else if (path == '/me/saved' || path == '/me/applications') {
      json = '{"items":[]}';
    } else {
      json = '{"error":{"message":"Нет такого"}}';
    }
    return ResponseBody.fromString(json, 200, headers: {Headers.contentTypeHeader: ['application/json']});
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    await initializeDateFormatting('ru');
    // В тестах шрифты по умолчанию заменяются квадратиками; грузим настоящие, чтобы снимки были как на телефоне
    for (final (family, file) in [('Manrope', 'Manrope-Variable.ttf'), ('JetBrainsMono', 'JetBrainsMono-Variable.ttf')]) {
      final loader = FontLoader(family)..addFont(rootBundle.load('assets/fonts/$file'));
      await loader.load();
    }
  });

  Future<void> shot(WidgetTester tester, String route, String name) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    tester.view.padding = const FakeViewPadding(top: 90, bottom: 72);
    addTearDown(tester.view.reset);
    FlutterSecureStoragePlatform.instance = MemoryStorage({'sw_token': 'jwt-test'});
    final dio = Dio(BaseOptions(baseUrl: '$apiBase/api/v1'))..httpClientAdapter = _FakeAdapter();
    final api = ApiClient(dio: dio, storage: const FlutterSecureStorage());
    await api.init();
    await tester.pumpWidget(ProviderScope(overrides: [apiProvider.overrideWithValue(api), pushProvider.overrideWithValue(FakePushService(api))], child: const StackworkApp()));
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    GoRouter.of(tester.element(find.byType(Scaffold).first)).go(route);
    await tester.pumpAndSettle(const Duration(milliseconds: 400));
    await expectLater(find.byType(StackworkApp), matchesGoldenFile('goldens/$name.png'));
  }

  const enabled = bool.fromEnvironment('SCREENSHOTS');
  testWidgets('лента', (t) => shot(t, '/', 'feed'), skip: !enabled);
  testWidgets('зарплаты', (t) => shot(t, '/salaries', 'salaries'), skip: !enabled);
  testWidgets('профиль', (t) => shot(t, '/profile', 'profile'), skip: !enabled);
}
