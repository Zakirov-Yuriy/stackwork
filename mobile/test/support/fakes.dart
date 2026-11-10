// Общие заглушки для тестов: push без Firebase, хранилище токена в памяти
import 'dart:async';

import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:stackwork_app/core/push.dart';

/// PushService без Firebase: init() ничего не делает, но потоки работают, чтобы проверять переходы по нажатию
class FakePushService extends PushService {
  FakePushService(super.api);
  final enabledFor = <bool>[];
  final openedController = StreamController<PushTarget>.broadcast();
  final foregroundController = StreamController<ForegroundPush>.broadcast();

  @override
  Stream<PushTarget> get opened => openedController.stream;
  @override
  Stream<ForegroundPush> get foreground => foregroundController.stream;
  @override
  Future<void> init() async {}
  @override
  Future<void> enableForCurrentUser() async => enabledFor.add(true);
  @override
  Future<void> disableForCurrentUser() async => enabledFor.add(false);
}

class MemoryStorage extends FlutterSecureStoragePlatform {
  MemoryStorage([Map<String, String>? initial]) : _data = {...?initial};
  final Map<String, String> _data;
  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async => _data.containsKey(key);
  @override
  Future<void> delete({required String key, required Map<String, String> options}) async => _data.remove(key);
  @override
  Future<void> deleteAll({required Map<String, String> options}) async => _data.clear();
  @override
  Future<String?> read({required String key, required Map<String, String> options}) async => _data[key];
  @override
  Future<Map<String, String>> readAll({required Map<String, String> options}) async => Map.of(_data);
  @override
  Future<void> write({required String key, required String value, required Map<String, String> options}) async => _data[key] = value;
}
