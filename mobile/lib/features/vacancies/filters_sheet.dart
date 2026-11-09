import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../widgets/soft.dart';

/// Шторка фильтров: формат, грейд, зарплата от, стек
Future<void> showFiltersSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Soft.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
    builder: (_) => const _FiltersSheet(),
  );
}

class _FiltersSheet extends ConsumerStatefulWidget {
  const _FiltersSheet();
  @override
  ConsumerState<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<_FiltersSheet> {
  late VacancyFilters draft;
  late final TextEditingController _salary;
  bool _allSkills = false;

  static const formats = [('REMOTE', 'Удалённо'), ('HYBRID', 'Гибрид'), ('OFFICE', 'Офис')];
  static const grades = [('JUNIOR', 'Junior'), ('MIDDLE', 'Middle'), ('SENIOR', 'Senior'), ('LEAD', 'Lead')];

  @override
  void initState() {
    super.initState();
    draft = ref.read(filtersProvider);
    _salary = TextEditingController(text: draft.salaryFrom == null ? '' : fmtNumber(draft.salaryFrom!));
  }

  @override
  void dispose() {
    _salary.dispose();
    super.dispose();
  }

  void _toggle(Set<String> set, String v, void Function(Set<String>) apply) {
    final next = {...set};
    next.contains(v) ? next.remove(v) : next.add(v);
    setState(() => apply(next));
  }

  @override
  Widget build(BuildContext context) {
    final skills = ref.watch(skillsProvider).value;
    final list = _allSkills ? (skills?.all ?? const <SkillRef>[]) : (skills?.popular ?? const <SkillRef>[]);
    final shown = [...list];
    // Выбранные, которых нет в коротком списке, показываем тоже
    for (final slug in draft.skills) {
      if (!shown.any((s) => s.slug == slug)) {
        final found = skills?.all.where((s) => s.slug == slug).firstOrNull;
        if (found != null) shown.insert(0, found);
      }
    }
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.86,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, controller) => Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 44, height: 5, decoration: BoxDecoration(color: Soft.dark, borderRadius: BorderRadius.circular(3))),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
              child: Row(
                children: [
                  Text('Фильтры', style: Soft.style(size: 22, weight: 800)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => setState(() {
                      draft = VacancyFilters(query: draft.query, sort: draft.sort);
                      _salary.clear();
                    }),
                    child: Text('Сбросить', style: Soft.style(size: 14, weight: 700, color: Soft.muted)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
                children: [
                  const SectionLabel('Формат'),
                  const SizedBox(height: 10),
                  _MultiSegments(items: formats, selected: draft.formats, onToggle: (v) => _toggle(draft.formats, v, (n) => draft = draft.copyWith(formats: n))),
                  const SizedBox(height: 20),
                  const SectionLabel('Грейд'),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [for (final g in grades) SoftChip(label: g.$2, active: draft.grades.contains(g.$1), onTap: () => _toggle(draft.grades, g.$1, (n) => draft = draft.copyWith(grades: n)))],
                  ),
                  const SizedBox(height: 20),
                  const SectionLabel('Зарплата от'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: SoftInset(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          radius: 14,
                          child: SizedBox(
                            height: 50,
                            child: TextField(
                              controller: _salary,
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly, _ThousandsFormatter()],
                              style: Soft.style(size: 16, weight: 600, mono: true),
                              decoration: InputDecoration(hintText: draft.currency == 'RUB' ? '150 000' : '100 000', hintStyle: Soft.style(size: 16, weight: 600, color: Soft.muted, mono: true), border: InputBorder.none, isCollapsed: true),
                              onChanged: (v) {
                                final n = int.tryParse(v.replaceAll(RegExp(r'\D'), ''));
                                setState(() => draft = n == null || n == 0 ? draft.copyWith(clearSalary: true) : draft.copyWith(salaryFrom: n));
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 130,
                        child: SoftSegments(
                          items: const ['₽', '\$'],
                          selected: draft.currency == 'USD' ? 1 : 0,
                          onSelected: (i) => setState(() => draft = draft.copyWith(currency: i == 1 ? 'USD' : 'RUB')),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(draft.currency == 'RUB' ? 'Рубли в месяц' : 'Доллары в год', style: Soft.style(size: 12, weight: 600, color: Soft.muted)),
                  const SizedBox(height: 20),
                  const SectionLabel('Стек'),
                  const SizedBox(height: 10),
                  if (skills == null)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Soft.blue))))
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final s in shown) SoftChip(label: s.name, active: draft.skills.contains(s.slug), onTap: () => _toggle(draft.skills, s.slug, (n) => draft = draft.copyWith(skills: n))),
                        if (!_allSkills && skills.all.length > shown.length)
                          GestureDetector(
                            onTap: () => setState(() => _allSkills = true),
                            child: Container(
                              height: 36,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(999), boxShadow: Soft.raised(4)),
                              alignment: Alignment.center,
                              child: Text('Ещё ${skills.all.length - shown.length}', style: Soft.style(size: 13, weight: 700, color: Soft.muted)),
                            ),
                          ),
                      ],
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: PrimaryButton(
                label: 'Показать вакансии',
                onPressed: () {
                  ref.read(filtersProvider.notifier).set(draft);
                  Navigator.of(context).pop();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Сегменты с множественным выбором на утопленной подложке
class _MultiSegments extends StatelessWidget {
  const _MultiSegments({required this.items, required this.selected, required this.onToggle});
  final List<(String, String)> items;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return SoftInset(
      padding: const EdgeInsets.all(5),
      radius: 16,
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onToggle(items[i].$1),
                child: Container(
                  height: 40,
                  margin: EdgeInsets.only(right: i == items.length - 1 ? 0 : 6),
                  decoration: selected.contains(items[i].$1) ? BoxDecoration(color: Soft.bg, borderRadius: BorderRadius.circular(12), boxShadow: Soft.raised(4)) : null,
                  alignment: Alignment.center,
                  child: Text(items[i].$2, style: Soft.style(size: 13, weight: selected.contains(items[i].$1) ? 800 : 700, color: selected.contains(items[i].$1) ? Soft.text : Soft.muted)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// «150000» → «150 000» по мере ввода
class _ThousandsFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return newValue.copyWith(text: '');
    final text = fmtNumber(int.parse(digits));
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}
