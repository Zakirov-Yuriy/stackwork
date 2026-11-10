import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/models.dart';

/// Адрес сайта. Для локальной отладки: flutter run --dart-define=API_BASE=http://10.0.2.2:3000
const String apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://stackworkjobs.vercel.app');

/// Ошибка API с понятным текстом (сообщение сервера или сетевое)
class ApiException implements Exception {
  ApiException(this.message, {this.status});
  final String message;
  final int? status;
  bool get isAuth => status == 401;
  @override
  String toString() => message;
}

/// Фильтры списка вакансий, один в один с параметрами GET /api/v1/vacancies
class VacancyFilters {
  const VacancyFilters({this.query = '', this.skills = const {}, this.formats = const {}, this.grades = const {}, this.salaryFrom, this.currency = 'RUB', this.sort = 'date'});
  final String query;
  final Set<String> skills;
  final Set<String> formats; // REMOTE | HYBRID | OFFICE
  final Set<String> grades; // JUNIOR | MIDDLE | SENIOR | LEAD
  final int? salaryFrom;
  final String currency;
  final String sort; // date | salary

  bool get isEmpty => query.isEmpty && skills.isEmpty && formats.isEmpty && grades.isEmpty && salaryFrom == null;
  int get activeCount => (skills.isEmpty ? 0 : 1) + (formats.isEmpty ? 0 : 1) + (grades.isEmpty ? 0 : 1) + (salaryFrom == null ? 0 : 1);

  Map<String, String> toQuery(int page) {
    final q = <String, String>{'page': '$page'};
    if (query.isNotEmpty) q['q'] = query;
    if (skills.isNotEmpty) q['skills'] = skills.join(',');
    if (formats.isNotEmpty) q['format'] = formats.join(',');
    if (grades.isNotEmpty) q['grade'] = grades.join(',');
    if (salaryFrom != null) {
      q['salary'] = '${salaryFrom!}';
      q['currency'] = currency;
    }
    if (sort != 'date') q['sort'] = sort;
    return q;
  }

  VacancyFilters copyWith({String? query, Set<String>? skills, Set<String>? formats, Set<String>? grades, int? salaryFrom, bool clearSalary = false, String? currency, String? sort}) => VacancyFilters(
        query: query ?? this.query,
        skills: skills ?? this.skills,
        formats: formats ?? this.formats,
        grades: grades ?? this.grades,
        salaryFrom: clearSalary ? null : (salaryFrom ?? this.salaryFrom),
        currency: currency ?? this.currency,
        sort: sort ?? this.sort,
      );
}

class ApiClient {
  ApiClient({Dio? dio, FlutterSecureStorage? storage})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: '$apiBase/api/v1', connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 30), headers: {'Accept': 'application/json', 'User-Agent': 'Stackwork-Android/1.0'})),
        _storage = storage ?? const FlutterSecureStorage(aOptions: AndroidOptions());

  final Dio _dio;
  final FlutterSecureStorage _storage;
  static const _tokenKey = 'sw_token';
  String? _token;

  String? get token => _token;
  bool get isAuthorized => _token != null;

  Future<void> init() async {
    _token = await _storage.read(key: _tokenKey);
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (o, h) {
      if (_token != null) o.headers['Authorization'] = 'Bearer $_token';
      h.next(o);
    }));
  }

  Future<void> setToken(String? token) async {
    _token = token;
    if (token == null) {
      await _storage.delete(key: _tokenKey);
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Future<Map<String, dynamic>> _request(String method, String path, {Map<String, dynamic>? query, Object? body}) async {
    try {
      final r = await _dio.request<dynamic>(path, queryParameters: query, data: body, options: Options(method: method));
      final data = r.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } on DioException catch (e) {
      final data = e.response?.data;
      final serverMessage = data is Map && data['error'] is Map ? (data['error'] as Map)['message'] as String? : null;
      final status = e.response?.statusCode;
      if (serverMessage != null) throw ApiException(serverMessage, status: status);
      if (e.error is SocketException || e.type == DioExceptionType.connectionError) throw ApiException('Нет связи с сервером. Проверьте интернет.');
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) throw ApiException('Сервер долго не отвечает, попробуйте ещё раз.');
      throw ApiException(status != null ? 'Ошибка сервера ($status)' : 'Что-то пошло не так', status: status);
    }
  }

  // ───── Вакансии и справочники ─────

  Future<VacancyPage> vacancies(VacancyFilters f, {int page = 1}) async => VacancyPage.fromJson(await _request('GET', '/vacancies', query: f.toQuery(page)));

  Future<VacancyDetail> vacancy(String slug) async => VacancyDetail.fromJson(await _request('GET', '/vacancies/$slug'));

  Future<SkillsCatalog> skills() async => SkillsCatalog.fromJson(await _request('GET', '/skills'));

  Future<SalaryTables> salaries() async => SalaryTables.fromJson(await _request('GET', '/salaries'));

  Future<SalaryBreakdown> salaryBySkill(String slug) async => SalaryBreakdown.fromJson(await _request('GET', '/salaries/$slug'));

  Future<({CompanyFull company, List<Vacancy> vacancies})> company(String slug) async {
    final j = await _request('GET', '/companies/$slug');
    final list = (j['vacancies'] as List? ?? const []).whereType<Map<String, dynamic>>().map(Vacancy.fromJson).toList();
    return (company: CompanyFull.fromJson(j['company'] as Map<String, dynamic>? ?? const {}), vacancies: list);
  }

  Future<AppMeta> meta() async => AppMeta.fromJson(await _request('GET', '/meta'));

  // ───── Аккаунт ─────

  Future<User> login(String email, String password) async {
    final j = await _request('POST', '/auth/login', body: {'email': email, 'password': password});
    await setToken(j['token'] as String?);
    return User.fromJson(j['user'] as Map<String, dynamic>? ?? const {});
  }

  Future<User> register({required String name, required String email, required String password}) async {
    final j = await _request('POST', '/auth/register', body: {'name': name, 'email': email, 'password': password, 'consent': true, 'locale': 'ru'});
    await setToken(j['token'] as String?);
    return User.fromJson(j['user'] as Map<String, dynamic>? ?? const {});
  }

  Future<void> forgot(String email) => _request('POST', '/auth/forgot', body: {'email': email, 'locale': 'ru'});

  Future<void> resendVerification() => _request('POST', '/auth/resend', body: {'locale': 'ru'});

  Future<Profile> me() async => Profile.fromJson(await _request('GET', '/me'));

  Future<void> deleteAccount(String password) async {
    await _request('DELETE', '/me', body: {'password': password});
    await setToken(null);
  }

  Future<void> logout() => setToken(null);

  /// Регистрация устройства для push: Firebase Installation ID. Возвращает, настроен ли сервер на отправку
  Future<bool> registerDevice(String fid, {String? appVersion}) async {
    final j = await _request('PUT', '/me/devices', body: {'token': fid, 'kind': 'fid', 'platform': 'android', 'appVersion': ?appVersion});
    return j['enabled'] == true;
  }

  Future<void> unregisterDevice(String token) => _request('DELETE', '/me/devices', body: {'token': token});

  Future<List<Vacancy>> saved() async {
    final j = await _request('GET', '/me/saved');
    return (j['items'] as List? ?? const []).whereType<Map<String, dynamic>>().map(Vacancy.fromJson).toList();
  }

  Future<void> save(String vacancyId) => _request('PUT', '/me/saved/$vacancyId');
  Future<void> unsave(String vacancyId) => _request('DELETE', '/me/saved/$vacancyId');

  Future<List<Application>> applications() async {
    final j = await _request('GET', '/me/applications');
    return (j['items'] as List? ?? const []).whereType<Map<String, dynamic>>().map(Application.fromJson).toList();
  }

  Future<void> apply(String slug, {String? coverLetter, String? githubUrl, String? resumeUrl}) => _request('POST', '/vacancies/$slug/apply', body: {
        if (coverLetter != null && coverLetter.isNotEmpty) 'coverLetter': coverLetter,
        if (githubUrl != null && githubUrl.isNotEmpty) 'githubUrl': githubUrl,
        if (resumeUrl != null && resumeUrl.isNotEmpty) 'resumeUrl': resumeUrl,
      });
}
