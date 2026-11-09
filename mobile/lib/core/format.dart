import 'package:intl/intl.dart';

/// Форматирование чисел и дат как на сайте (ru-RU)
final _nf = NumberFormat.decimalPattern('ru');

String fmtNumber(num v) => _nf.format(v).replaceAll(' ', ' ');

const currencySign = {'RUB': '₽', 'USD': '\$', 'EUR': '€', 'GBP': '£', 'KZT': '₸', 'UAH': '₴', 'BYN': 'Br', 'INR': '₹', 'JPY': '¥', 'CNY': '¥', 'CAD': 'C\$', 'AUD': 'A\$', 'PLN': 'zł', 'CHF': 'CHF', 'TRY': '₺', 'BRL': 'R\$'};

String sign(String currency) => currencySign[currency] ?? currency;

/// «222 500 $ в год» / «70 000 ₽»
String fmtMoney(int value, String currency, String period) => '${fmtNumber(value)} ${sign(currency)}${period == 'YEAR' ? ' в год' : period == 'HOUR' ? ' в час' : ''}';

String fmtAgo(DateTime? d) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 60) return 'только что';
  if (diff.inHours < 24) return '${diff.inHours} ${_plural(diff.inHours, 'час', 'часа', 'часов')} назад';
  if (diff.inDays == 1) return 'вчера';
  if (diff.inDays < 7) return '${diff.inDays} ${_plural(diff.inDays, 'день', 'дня', 'дней')} назад';
  if (diff.inDays < 30) return '${diff.inDays ~/ 7} ${_plural(diff.inDays ~/ 7, 'неделю', 'недели', 'недель')} назад';
  return DateFormat('d MMMM', 'ru').format(d);
}

String fmtDate(DateTime? d) => d == null ? '' : DateFormat('d MMMM yyyy', 'ru').format(d);

String plural(int n, String one, String few, String many) => '$n ${_plural(n, one, few, many)}';

String _plural(int n, String one, String few, String many) {
  final m10 = n % 10, m100 = n % 100;
  if (m10 == 1 && m100 != 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/// «4 312 вакансий»
String fmtVacancies(int n) => '${fmtNumber(n)} ${_plural(n, 'вакансия', 'вакансии', 'вакансий')}';

/// «ноябрь 2026» для месяца «2026-11»
String fmtMonth(String key) {
  final parts = key.split('-');
  if (parts.length != 2) return key;
  const names = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  final m = int.tryParse(parts[1]) ?? 1;
  return names[(m - 1).clamp(0, 11)];
}
