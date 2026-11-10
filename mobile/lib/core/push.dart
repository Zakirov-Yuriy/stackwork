import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api.dart';

/// Куда вести по нажатию на уведомление
class PushTarget {
  const PushTarget(this.route);
  final String route;

  /// Данные уведомления с сервера (src/lib/push.ts): type, vacancySlug, applicationId, url
  static PushTarget? fromData(Map<String, dynamic> data) {
    final type = data['type']?.toString();
    final slug = data['vacancySlug']?.toString();
    switch (type) {
      case 'application_status':
        // ответ работодателя: список откликов в профиле, там видно статус и сообщение
        return const PushTarget('/profile');
      case 'new_application':
        // новый отклик работодателю: кабинет на сайте, приложение откроет вакансию
        return slug != null && slug.isNotEmpty ? PushTarget('/vacancies/$slug') : const PushTarget('/');
      default:
        return slug != null && slug.isNotEmpty ? PushTarget('/vacancies/$slug') : null;
    }
  }
}

/// Сообщение, пришедшее, пока приложение открыто (показываем баннером внутри приложения)
class ForegroundPush {
  const ForegroundPush({required this.title, required this.body, this.target});
  final String title;
  final String body;
  final PushTarget? target;
}

/// Push-уведомления через Firebase Cloud Messaging.
///
/// Firebase настраивается файлом android/app/google-services.json из консоли Firebase. Если файла нет,
/// Firebase.initializeApp() бросает исключение, сервис остаётся выключенным, остальное приложение работает.
/// FCM адресует устройство по Firebase Installation ID (FID): после входа вызываем register(), FID приходит
/// в onRegistered и уходит на сервер (PUT /me/devices, kind fid); при выходе снимаем его с сервера и unregister().
class PushService {
  PushService(this._api);
  final ApiClient _api;

  bool _ready = false;
  String? _fid;
  StreamSubscription<String>? _registeredSub;
  StreamSubscription<RemoteMessage>? _foregroundSub;
  StreamSubscription<RemoteMessage>? _openedSub;

  final _opened = StreamController<PushTarget>.broadcast();
  final _foreground = StreamController<ForegroundPush>.broadcast();

  /// Нажатия на уведомления (из фона и при холодном старте)
  Stream<PushTarget> get opened => _opened.stream;

  /// Уведомления, пришедшие при открытом приложении
  Stream<ForegroundPush> get foreground => _foreground.stream;

  bool get isReady => _ready;

  /// Инициализация Firebase. Безопасно вызывать всегда: без конфигурации просто выключает push
  Future<void> init() async {
    try {
      await Firebase.initializeApp();
      _ready = true;
    } catch (e) {
      debugPrint('Push выключены: Firebase не настроен ($e)');
      return;
    }
    final messaging = FirebaseMessaging.instance;

    _foregroundSub = FirebaseMessaging.onMessage.listen((m) {
      final n = m.notification;
      if (n == null && m.data.isEmpty) return;
      _foreground.add(ForegroundPush(title: n?.title ?? 'Stackwork', body: n?.body ?? '', target: PushTarget.fromData(m.data)));
    });
    _openedSub = FirebaseMessaging.onMessageOpenedApp.listen((m) {
      final t = PushTarget.fromData(m.data);
      if (t != null) _opened.add(t);
    });
    // Холодный старт по нажатию на уведомление
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      final t = PushTarget.fromData(initial.data);
      if (t != null) scheduleMicrotask(() => _opened.add(t));
    }
    // FID приходит после register() и при его смене; отправляем на сервер, если пользователь вошёл
    _registeredSub = messaging.onRegistered.listen((fid) {
      _fid = fid;
      if (_api.isAuthorized) unawaited(_register(fid));
    });
  }

  /// После входа: спросить разрешение (Android 13+) и зарегистрировать устройство в FCM и на сервере
  Future<void> enableForCurrentUser() async {
    if (!_ready || !_api.isAuthorized) return;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      if (_fid != null) {
        await _register(_fid!);
      } else {
        // FID придёт в onRegistered, там и отправим на сервер
        await FirebaseMessaging.instance.register();
      }
    } catch (e) {
      debugPrint('Push: не удалось включить ($e)');
    }
  }

  /// Перед выходом из аккаунта: снять устройство с сервера, чтобы уведомления не приходили чужому пользователю
  Future<void> disableForCurrentUser() async {
    if (!_ready) return;
    try {
      if (_fid != null && _api.isAuthorized) await _api.unregisterDevice(_fid!);
      await FirebaseMessaging.instance.unregister();
      _fid = null;
    } catch (e) {
      debugPrint('Push: не удалось отключить ($e)');
    }
  }

  Future<void> _register(String fid) async {
    try {
      final info = await PackageInfo.fromPlatform();
      await _api.registerDevice(fid, appVersion: '${info.version}+${info.buildNumber}');
    } on ApiException catch (e) {
      debugPrint('Push: сервер не принял устройство (${e.message})');
    }
  }

  void dispose() {
    _registeredSub?.cancel();
    _foregroundSub?.cancel();
    _openedSub?.cancel();
    _opened.close();
    _foreground.close();
  }
}
