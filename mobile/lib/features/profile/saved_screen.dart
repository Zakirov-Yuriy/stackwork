import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../widgets/soft.dart';
import '../../widgets/vacancy_card.dart';

/// Сохранённые вакансии (гость видит приглашение войти)
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final saved = ref.watch(savedProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: session == null
            ? StatusView(
                icon: Icons.bookmark_border_rounded,
                title: 'Сохранённые вакансии',
                text: 'Войдите, чтобы сохранять вакансии и видеть их на сайте и в приложении.',
                actionLabel: 'Войти',
                onAction: () => context.push('/login?next=/saved'),
              )
            : RefreshIndicator(
                color: Soft.blue,
                onRefresh: () => ref.refresh(savedProvider.future),
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Сохранённые', style: Soft.style(size: 26, weight: 800, height: 1.15, letterSpacing: -0.5)),
                            const SizedBox(height: 4),
                            Text(saved.value != null ? fmtVacancies(saved.value!.length) : 'Загружаем…', style: Soft.style(size: 14, weight: 600, color: Soft.muted)),
                          ],
                        ),
                      ),
                    ),
                    ...saved.when(
                      loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: Soft.blue)))],
                      error: (e, _) => [SliverFillRemaining(hasScrollBody: false, child: StatusView(icon: Icons.cloud_off_rounded, title: 'Не удалось загрузить', text: e is ApiException ? e.message : null, actionLabel: 'Повторить', onAction: () => ref.invalidate(savedProvider)))],
                      data: (items) => [
                        if (items.isEmpty)
                          SliverFillRemaining(hasScrollBody: false, child: StatusView(icon: Icons.bookmark_border_rounded, title: 'Пока пусто', text: 'Нажмите на закладку в карточке вакансии, и она появится здесь.', actionLabel: 'К вакансиям', onAction: () => context.go('/')))
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                            sliver: SliverList.separated(itemCount: items.length, separatorBuilder: (_, _) => const SizedBox(height: 14), itemBuilder: (_, i) => VacancyCard(vacancy: items[i])),
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
