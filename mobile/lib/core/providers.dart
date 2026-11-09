import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import 'api.dart';

/// Один клиент на приложение; init() вызывается в main() до runApp
final apiProvider = Provider<ApiClient>((ref) => throw UnimplementedError('apiProvider задаётся в main через overrideWithValue'));

/// Текущий пользователь: null = гость. Меняется при входе, выходе, удалении аккаунта.
class SessionNotifier extends Notifier<User?> {
  @override
  User? build() => null;

  Future<void> restore() async {
    final api = ref.read(apiProvider);
    if (!api.isAuthorized) return;
    try {
      state = (await api.me()).user;
    } on ApiException catch (e) {
      if (e.isAuth) await api.logout();
    }
  }

  /// Зависимые провайдеры (профиль, сохранённые, отклики, лента) следят за sessionProvider
  /// и перезагружаются сами, когда меняется state
  Future<void> login(String email, String password) async {
    state = await ref.read(apiProvider).login(email, password);
  }

  Future<void> register({required String name, required String email, required String password}) async {
    state = await ref.read(apiProvider).register(name: name, email: email, password: password);
  }

  Future<void> refresh() async {
    if (!ref.read(apiProvider).isAuthorized) return;
    state = (await ref.read(apiProvider).me()).user;
  }

  Future<void> logout() async {
    await ref.read(apiProvider).logout();
    state = null;
  }

  Future<void> deleteAccount(String password) async {
    await ref.read(apiProvider).deleteAccount(password);
    state = null;
  }
}

final sessionProvider = NotifierProvider<SessionNotifier, User?>(SessionNotifier.new);

final profileProvider = FutureProvider<Profile?>((ref) async {
  ref.watch(sessionProvider);
  final api = ref.watch(apiProvider);
  if (!api.isAuthorized) return null;
  return api.me();
});

final metaProvider = FutureProvider<AppMeta>((ref) => ref.watch(apiProvider).meta());
final skillsProvider = FutureProvider<SkillsCatalog>((ref) => ref.watch(apiProvider).skills());
final salariesProvider = FutureProvider<SalaryTables>((ref) => ref.watch(apiProvider).salaries());
final salaryBySkillProvider = FutureProvider.family<SalaryBreakdown, String>((ref, slug) => ref.watch(apiProvider).salaryBySkill(slug));
final vacancyDetailProvider = FutureProvider.family<VacancyDetail, String>((ref, slug) => ref.watch(apiProvider).vacancy(slug));
final companyProvider = FutureProvider.family<({CompanyFull company, List<Vacancy> vacancies}), String>((ref, slug) => ref.watch(apiProvider).company(slug));
final applicationsProvider = FutureProvider<List<Application>>((ref) async {
  ref.watch(sessionProvider);
  return ref.watch(apiProvider).applications();
});

/// Фильтры ленты
class FiltersNotifier extends Notifier<VacancyFilters> {
  @override
  VacancyFilters build() => const VacancyFilters();
  void set(VacancyFilters f) => state = f;
  void reset() => state = const VacancyFilters();
  void toggleSkill(String slug) {
    final next = {...state.skills};
    next.contains(slug) ? next.remove(slug) : next.add(slug);
    state = state.copyWith(skills: next);
  }
  void toggleFormat(String f) {
    final next = {...state.formats};
    next.contains(f) ? next.remove(f) : next.add(f);
    state = state.copyWith(formats: next);
  }
  void setQuery(String q) => state = state.copyWith(query: q.trim());
  void setSort(String sort) => state = state.copyWith(sort: sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, VacancyFilters>(FiltersNotifier.new);

/// Лента с подгрузкой страниц
class VacancyListState {
  const VacancyListState({this.items = const [], this.page = 0, this.pages = 1, this.total = 0, this.loadingMore = false});
  final List<Vacancy> items;
  final int page;
  final int pages;
  final int total;
  final bool loadingMore;
  bool get hasMore => page < pages;
  VacancyListState copyWith({List<Vacancy>? items, int? page, int? pages, int? total, bool? loadingMore}) =>
      VacancyListState(items: items ?? this.items, page: page ?? this.page, pages: pages ?? this.pages, total: total ?? this.total, loadingMore: loadingMore ?? this.loadingMore);
}

class VacancyListNotifier extends AsyncNotifier<VacancyListState> {
  @override
  Future<VacancyListState> build() async {
    final filters = ref.watch(filtersProvider);
    ref.watch(sessionProvider); // после входа карточки приходят с флагом «сохранено»
    final first = await ref.watch(apiProvider).vacancies(filters, page: 1);
    return VacancyListState(items: first.items, page: 1, pages: first.pages, total: first.total);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await ref.read(apiProvider).vacancies(ref.read(filtersProvider), page: current.page + 1);
      final seen = current.items.map((v) => v.id).toSet();
      state = AsyncData(current.copyWith(items: [...current.items, ...next.items.where((v) => !seen.contains(v.id))], page: next.page, pages: next.pages, total: next.total, loadingMore: false));
    } catch (_) {
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  void markSaved(String id, bool saved) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(items: [for (final v in current.items) v.id == id ? v.copyWith(saved: saved) : v]));
  }
}

final vacancyListProvider = AsyncNotifierProvider<VacancyListNotifier, VacancyListState>(VacancyListNotifier.new);

/// Сохранённые: список и быстрый набор id для кнопок-закладок
class SavedNotifier extends AsyncNotifier<List<Vacancy>> {
  @override
  Future<List<Vacancy>> build() async {
    ref.watch(sessionProvider);
    final api = ref.watch(apiProvider);
    if (!api.isAuthorized) return const [];
    return api.saved();
  }

  bool isSaved(String id) => (state.value ?? const []).any((v) => v.id == id);

  /// Возвращает false, если нужен вход
  Future<bool> toggle(Vacancy v) async {
    final api = ref.read(apiProvider);
    if (!api.isAuthorized) return false;
    final current = state.value ?? const <Vacancy>[];
    final saved = current.any((x) => x.id == v.id);
    // Оптимистично меняем список, потом подтверждаем запросом
    state = AsyncData(saved ? current.where((x) => x.id != v.id).toList() : [v.copyWith(saved: true), ...current]);
    ref.read(vacancyListProvider.notifier).markSaved(v.id, !saved);
    try {
      if (saved) {
        await api.unsave(v.id);
      } else {
        await api.save(v.id);
      }
    } catch (_) {
      state = AsyncData(current);
      ref.read(vacancyListProvider.notifier).markSaved(v.id, saved);
      rethrow;
    }
    ref.invalidate(profileProvider);
    return true;
  }
}

final savedProvider = AsyncNotifierProvider<SavedNotifier, List<Vacancy>>(SavedNotifier.new);
