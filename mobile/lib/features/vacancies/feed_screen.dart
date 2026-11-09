import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';
import '../../widgets/vacancy_card.dart';
import 'filters_sheet.dart';

/// Лента: шапка, поиск, быстрые фильтры, карточки с подгрузкой
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});
  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 600) ref.read(vacancyListProvider.notifier).loadMore();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(vacancyListProvider);
    final filters = ref.watch(filtersProvider);
    final skills = ref.watch(skillsProvider).value;
    final session = ref.watch(sessionProvider);
    final quick = (skills?.popular ?? const <SkillRef>[]).take(6).toList();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: Soft.blue,
          onRefresh: () => ref.read(vacancyListProvider.notifier).refresh(),
          child: CustomScrollView(
            controller: _scroll,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const _Brand(),
                          const Spacer(),
                          SoftIconButton(
                            icon: Icons.person_outline_rounded,
                            tooltip: 'Профиль',
                            size: 40,
                            color: Soft.muted,
                            onPressed: () => context.go(session == null ? '/login' : '/profile'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 22),
                      Text('IT-вакансии с зарплатой', style: Soft.style(size: 26, weight: 800, height: 1.15, letterSpacing: -0.5)),
                      const SizedBox(height: 4),
                      Text(
                        list.value != null ? '${fmtVacancies(list.value!.total)} · вилка и стек в каждой карточке' : 'Вилка и стек в каждой карточке',
                        style: Soft.style(size: 14, weight: 600, color: Soft.muted),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: SoftField(
                              controller: _search,
                              hint: 'Go, React, DevOps…',
                              icon: Icons.search_rounded,
                              textInputAction: TextInputAction.search,
                              onSubmitted: (q) => ref.read(filtersProvider.notifier).setQuery(q),
                              trailing: filters.query.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.close_rounded, size: 18, color: Soft.muted),
                                      tooltip: 'Очистить',
                                      onPressed: () {
                                        _search.clear();
                                        ref.read(filtersProvider.notifier).setQuery('');
                                      },
                                    )
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Stack(
                            children: [
                              SoftIconButton(icon: Icons.tune_rounded, tooltip: 'Фильтры', size: 52, color: Soft.blue, onPressed: () => showFiltersSheet(context)),
                              if (filters.activeCount > 0)
                                Positioned(right: 10, top: 10, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Soft.blue, shape: BoxShape.circle))),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          clipBehavior: Clip.none,
                          children: [
                            SoftChip(label: 'Удалённо', active: filters.formats.contains('REMOTE'), onTap: () => ref.read(filtersProvider.notifier).toggleFormat('REMOTE')),
                            for (final s in quick) ...[
                              const SizedBox(width: 8),
                              SoftChip(label: s.name, active: filters.skills.contains(s.slug), onTap: () => ref.read(filtersProvider.notifier).toggleSkill(s.slug)),
                            ],
                            const SizedBox(width: 8),
                            SoftChip(label: filters.sort == 'salary' ? 'По зарплате' : 'По дате', active: filters.sort == 'salary', onTap: () => ref.read(filtersProvider.notifier).setSort(filters.sort == 'salary' ? 'date' : 'salary')),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],
                  ),
                ),
              ),
              ...list.when(
                loading: () => [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    sliver: SliverList.separated(itemCount: 4, itemBuilder: (_, _) => const VacancyCardSkeleton(), separatorBuilder: (_, _) => const SizedBox(height: 14)),
                  ),
                ],
                error: (e, _) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: StatusView(
                      icon: Icons.cloud_off_rounded,
                      title: 'Не удалось загрузить вакансии',
                      text: e is ApiException ? e.message : 'Проверьте интернет и попробуйте ещё раз.',
                      actionLabel: 'Повторить',
                      onAction: () => ref.invalidate(vacancyListProvider),
                    ),
                  ),
                ],
                data: (data) => [
                  if (data.items.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: StatusView(
                        title: 'Ничего не нашлось',
                        text: 'Попробуйте убрать часть фильтров или изменить запрос.',
                        actionLabel: filters.isEmpty ? null : 'Сбросить фильтры',
                        onAction: () {
                          _search.clear();
                          ref.read(filtersProvider.notifier).reset();
                        },
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                      sliver: SliverList.separated(
                        itemCount: data.items.length + (data.hasMore ? 1 : 0),
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (context, i) {
                          if (i >= data.items.length) {
                            return const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Soft.blue))));
                          }
                          return VacancyCard(vacancy: data.items[i]);
                        },
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(12), boxShadow: Soft.raised(6)),
          alignment: Alignment.center,
          child: Text('S', style: Soft.style(size: 22, weight: 800, color: Soft.blue)),
        ),
        const SizedBox(width: 12),
        Text('stackwork', style: Soft.style(size: 22, weight: 800, letterSpacing: -0.3)),
      ],
    );
  }
}
