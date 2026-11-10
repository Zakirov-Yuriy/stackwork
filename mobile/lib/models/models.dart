/// Модели ответов API v1 сайта (src/lib/api.ts). Поля стабильны, лишние игнорируем.
library;

String _s(Object? v, [String fallback = '']) => v is String ? v : fallback;
String? _sn(Object? v) => v is String && v.isNotEmpty ? v : null;
int? _i(Object? v) => v is int ? v : (v is num ? v.round() : null);
bool _b(Object? v) => v == true;
Map<String, dynamic> _m(Object? v) => v is Map<String, dynamic> ? v : const {};
List<Map<String, dynamic>> _list(Object? v) => v is List ? v.whereType<Map<String, dynamic>>().toList() : const [];

class CompanyRef {
  const CompanyRef({required this.slug, required this.name, required this.initials, this.logoUrl});
  final String slug;
  final String name;
  final String initials;
  final String? logoUrl;

  factory CompanyRef.fromJson(Map<String, dynamic> j) => CompanyRef(
        slug: _s(j['slug']),
        name: _s(j['name'], 'Компания'),
        initials: _sn(j['initials']) ?? _s(j['name'], 'К').substring(0, 1),
        logoUrl: _sn(j['logoUrl']),
      );
}

class Salary {
  const Salary({this.from, this.to, required this.currency, required this.period, required this.formatted, this.type});
  final int? from;
  final int? to;
  final String currency;
  final String period; // MONTH | YEAR | HOUR
  final String formatted; // готовая строка с сайта: «180 000 – 220 000 $ в год»
  final String? type;

  bool get isSet => from != null || to != null;

  factory Salary.fromJson(Map<String, dynamic> j) => Salary(
        from: _i(j['from']),
        to: _i(j['to']),
        currency: _s(j['currency'], 'RUB'),
        period: _s(j['period'], 'MONTH'),
        formatted: _s(j['formatted']),
        type: _sn(j['type']),
      );
}

class SkillRef {
  const SkillRef({required this.slug, required this.name, this.count});
  final String slug;
  final String name;
  final int? count;
  factory SkillRef.fromJson(Map<String, dynamic> j) => SkillRef(slug: _s(j['slug']), name: _s(j['name']), count: _i(j['count']));
}

class Vacancy {
  const Vacancy({
    required this.id,
    required this.slug,
    required this.title,
    required this.company,
    required this.salary,
    required this.skills,
    required this.grade,
    required this.gradeLabel,
    required this.workFormat,
    required this.workFormatLabel,
    required this.employmentLabel,
    required this.experienceLabel,
    this.city,
    this.locationNote,
    this.source,
    this.sourceLabel,
    this.externalUrl,
    this.applyUrl,
    this.language,
    this.publishedAt,
    this.saved = false,
  });

  final String id;
  final String slug;
  final String title;
  final CompanyRef company;
  final Salary salary;
  final List<SkillRef> skills;
  final String grade;
  final String gradeLabel;
  final String workFormat; // REMOTE | HYBRID | OFFICE | REMOTE_OR_OFFICE
  final String workFormatLabel;
  final String employmentLabel;
  final String experienceLabel;
  final String? city;
  final String? locationNote;
  final String? source;
  final String? sourceLabel;
  final String? externalUrl;
  final String? applyUrl;
  final String? language;
  final DateTime? publishedAt;
  final bool saved;

  bool get isRemote => workFormat == 'REMOTE' || workFormat == 'REMOTE_OR_OFFICE';
  bool get isInternal => source == 'MANUAL';

  /// «Удалённо, EU» или «Москва, гибрид» как на карточках сайта
  String get location {
    final parts = <String>[];
    if (isRemote) {
      parts.add('Удалённо');
      if (locationNote != null && locationNote!.isNotEmpty) parts.add(locationNote!);
    } else {
      if (city != null && city!.isNotEmpty) parts.add(city!);
      parts.add(workFormat == 'HYBRID' ? 'гибрид' : 'офис');
    }
    return parts.join(', ');
  }

  factory Vacancy.fromJson(Map<String, dynamic> j) => Vacancy(
        id: _s(j['id']),
        slug: _s(j['slug']),
        title: _s(j['title']),
        company: CompanyRef.fromJson(_m(j['company'])),
        salary: Salary.fromJson(_m(j['salary'])),
        skills: _list(j['skills']).map(SkillRef.fromJson).toList(),
        grade: _s(j['grade'], 'MIDDLE'),
        gradeLabel: _s(j['gradeLabel']),
        workFormat: _s(j['workFormat'], 'REMOTE'),
        workFormatLabel: _s(j['workFormatLabel']),
        employmentLabel: _s(j['employmentLabel']),
        experienceLabel: _s(j['experienceLabel']),
        city: _sn(j['city']),
        locationNote: _sn(j['locationNote']),
        source: _sn(j['source']),
        sourceLabel: _sn(j['sourceLabel']),
        externalUrl: _sn(j['externalUrl']),
        applyUrl: _sn(j['applyUrl']),
        language: _sn(j['language']),
        publishedAt: j['publishedAt'] is String ? DateTime.tryParse(j['publishedAt'] as String) : null,
        saved: _b(j['saved']),
      );

  Vacancy copyWith({bool? saved}) => Vacancy(
        id: id,
        slug: slug,
        title: title,
        company: company,
        salary: salary,
        skills: skills,
        grade: grade,
        gradeLabel: gradeLabel,
        workFormat: workFormat,
        workFormatLabel: workFormatLabel,
        employmentLabel: employmentLabel,
        experienceLabel: experienceLabel,
        city: city,
        locationNote: locationNote,
        source: source,
        sourceLabel: sourceLabel,
        externalUrl: externalUrl,
        applyUrl: applyUrl,
        language: language,
        publishedAt: publishedAt,
        saved: saved ?? this.saved,
      );
}

class VacancyPage {
  const VacancyPage({required this.items, required this.page, required this.pages, required this.total});
  final List<Vacancy> items;
  final int page;
  final int pages;
  final int total;
  factory VacancyPage.fromJson(Map<String, dynamic> j) => VacancyPage(
        items: _list(j['items']).map(Vacancy.fromJson).toList(),
        page: _i(j['page']) ?? 1,
        pages: _i(j['pages']) ?? 1,
        total: _i(j['total']) ?? 0,
      );
}

class CompanyFull {
  const CompanyFull({required this.ref, this.industry, this.city, this.description, this.website});
  final CompanyRef ref;
  final String? industry;
  final String? city;
  final String? description;
  final String? website;
  factory CompanyFull.fromJson(Map<String, dynamic> j) => CompanyFull(
        ref: CompanyRef.fromJson(j),
        industry: _sn(j['industry']),
        city: _sn(j['city']),
        description: _sn(j['description']),
        website: _sn(j['website']),
      );
}

class VacancyDetail {
  const VacancyDetail({required this.vacancy, required this.company, required this.closed, this.descriptionHtml, required this.sections, required this.similar});
  final Vacancy vacancy;
  final CompanyFull company;
  final bool closed;
  final String? descriptionHtml;
  /// Разделы у вакансий работодателей Stackwork: aboutTeam, responsibilities, requirements, niceToHave, conditions
  final Map<String, String> sections;
  final List<Vacancy> similar;

  factory VacancyDetail.fromJson(Map<String, dynamic> j) {
    final sections = <String, String>{};
    _m(j['description']).forEach((k, v) {
      if (v is String && v.trim().isNotEmpty) sections[k] = v;
    });
    return VacancyDetail(
      vacancy: Vacancy.fromJson(j),
      company: CompanyFull.fromJson(_m(j['company'])),
      closed: _b(j['closed']),
      descriptionHtml: _sn(j['descriptionHtml']),
      sections: sections,
      similar: _list(j['similar']).map(Vacancy.fromJson).toList(),
    );
  }
}

class SkillsCatalog {
  const SkillsCatalog({required this.popular, required this.all, required this.formatCounts, required this.gradeCounts});
  final List<SkillRef> popular;
  final List<SkillRef> all;
  final Map<String, int> formatCounts;
  final Map<String, int> gradeCounts;
  factory SkillsCatalog.fromJson(Map<String, dynamic> j) {
    final facets = _m(j['facets']);
    Map<String, int> counts(Object? v) => _m(v).map((k, val) => MapEntry(k, _i(val) ?? 0));
    return SkillsCatalog(
      popular: _list(j['popular']).map(SkillRef.fromJson).toList(),
      all: _list(j['all']).map(SkillRef.fromJson).toList(),
      formatCounts: counts(facets['format']),
      gradeCounts: counts(facets['grade']),
    );
  }
}

class SalaryRow {
  const SalaryRow({required this.slug, required this.name, required this.count, required this.median, required this.from, required this.to});
  final String slug;
  final String name;
  final int count;
  final int median;
  final int from;
  final int to;
  factory SalaryRow.fromJson(Map<String, dynamic> j) => SalaryRow(slug: _s(j['slug']), name: _s(j['name']), count: _i(j['count']) ?? 0, median: _i(j['median']) ?? 0, from: _i(j['from']) ?? 0, to: _i(j['to']) ?? 0);
}

class SalaryTables {
  const SalaryTables({required this.rub, required this.usd});
  final List<SalaryRow> rub;
  final List<SalaryRow> usd;
  factory SalaryTables.fromJson(Map<String, dynamic> j) => SalaryTables(rub: _list(j['rub']).map(SalaryRow.fromJson).toList(), usd: _list(j['usd']).map(SalaryRow.fromJson).toList());
}

class SalaryStat {
  const SalaryStat({required this.currency, required this.period, required this.count, required this.median, required this.p25, required this.p75});
  final String currency;
  final String period;
  final int count;
  final int median;
  final int p25;
  final int p75;
  static SalaryStat? fromJson(Object? v) {
    if (v is! Map<String, dynamic>) return null;
    return SalaryStat(currency: _s(v['currency'], 'USD'), period: _s(v['period'], 'YEAR'), count: _i(v['count']) ?? 0, median: _i(v['median']) ?? 0, p25: _i(v['p25']) ?? 0, p75: _i(v['p75']) ?? 0);
  }
}

class TrendPoint {
  const TrendPoint({required this.month, this.median, required this.count});
  final String month;
  final int? median;
  final int count;
}

class SalaryBreakdown {
  const SalaryBreakdown({required this.skill, required this.total, required this.remote, required this.salary, this.salaryAlt, required this.byGrade, this.remoteStat, this.officeStat, required this.trend, required this.related, required this.topPaid});
  final SkillRef skill;
  final int total;
  final int remote;
  final SalaryStat salary;
  final SalaryStat? salaryAlt;
  final List<MapEntry<String, SalaryStat?>> byGrade;
  final SalaryStat? remoteStat;
  final SalaryStat? officeStat;
  final List<TrendPoint> trend;
  final List<SkillRef> related;
  final List<Vacancy> topPaid;

  factory SalaryBreakdown.fromJson(Map<String, dynamic> j) {
    final fmt = _m(j['byFormat']);
    return SalaryBreakdown(
      skill: SkillRef.fromJson(_m(j['skill'])),
      total: _i(j['total']) ?? 0,
      remote: _i(j['remote']) ?? 0,
      salary: SalaryStat.fromJson(j['salary']) ?? const SalaryStat(currency: 'USD', period: 'YEAR', count: 0, median: 0, p25: 0, p75: 0),
      salaryAlt: SalaryStat.fromJson(j['salaryAlt']),
      byGrade: _list(j['byGrade']).map((g) => MapEntry(_s(g['grade']), SalaryStat.fromJson(g['stat']))).toList(),
      remoteStat: SalaryStat.fromJson(fmt['remote']),
      officeStat: SalaryStat.fromJson(fmt['office']),
      trend: _list(j['trend']).map((t) => TrendPoint(month: _s(t['month']), median: _i(t['median']), count: _i(t['count']) ?? 0)).toList(),
      related: _list(j['related']).map(SkillRef.fromJson).toList(),
      topPaid: _list(j['topPaid']).map(Vacancy.fromJson).toList(),
    );
  }
}

class User {
  const User({required this.id, required this.email, this.name, required this.role, required this.emailVerified});
  final String id;
  final String email;
  final String? name;
  final String role;
  final bool emailVerified;
  bool get isCandidate => role == 'CANDIDATE';
  String get displayName => (name ?? '').trim().isNotEmpty ? name!.trim() : email;
  String get initial => displayName.substring(0, 1).toUpperCase();
  factory User.fromJson(Map<String, dynamic> j) => User(id: _s(j['id']), email: _s(j['email']), name: _sn(j['name']), role: _s(j['role'], 'CANDIDATE'), emailVerified: _b(j['emailVerified']));
}

class Profile {
  const Profile({required this.user, required this.savedCount, required this.applicationsCount});
  final User user;
  final int savedCount;
  final int applicationsCount;
  factory Profile.fromJson(Map<String, dynamic> j) {
    final counts = _m(j['counts']);
    return Profile(user: User.fromJson(_m(j['user'])), savedCount: _i(counts['saved']) ?? 0, applicationsCount: _i(counts['applications']) ?? 0);
  }
}

class Application {
  const Application({required this.id, required this.status, required this.statusLabel, required this.createdAt, required this.vacancy, this.employerNote, this.statusChangedAt});
  final String id;
  final String status;
  final String statusLabel;
  final DateTime? createdAt;
  final Vacancy vacancy;
  /// Сообщение работодателя при последней смене статуса
  final String? employerNote;
  final DateTime? statusChangedAt;
  factory Application.fromJson(Map<String, dynamic> j) => Application(
        id: _s(j['id']),
        status: _s(j['status'], 'NEW'),
        statusLabel: _s(j['statusLabel'], 'Новый'),
        createdAt: j['createdAt'] is String ? DateTime.tryParse(j['createdAt'] as String) : null,
        vacancy: Vacancy.fromJson(_m(j['vacancy'])),
        employerNote: (j['employerNote'] as String?)?.trim().isNotEmpty == true ? (j['employerNote'] as String).trim() : null,
        statusChangedAt: j['statusChangedAt'] is String ? DateTime.tryParse(j['statusChangedAt'] as String) : null,
      );
}

class AppMeta {
  const AppMeta({required this.siteUrl, required this.privacyUrl, required this.termsUrl, required this.deleteAccountUrl, required this.telegramChannel, required this.minAppVersion, required this.publishedVacancies});
  final String siteUrl;
  final String privacyUrl;
  final String termsUrl;
  final String deleteAccountUrl;
  final String telegramChannel;
  final String minAppVersion;
  final int publishedVacancies;
  factory AppMeta.fromJson(Map<String, dynamic> j) => AppMeta(
        siteUrl: _s(j['siteUrl']),
        privacyUrl: _s(j['privacyUrl']),
        termsUrl: _s(j['termsUrl']),
        deleteAccountUrl: _s(j['deleteAccountUrl']),
        telegramChannel: _s(j['telegramChannel'], 'https://t.me/stackworkjobs'),
        minAppVersion: _s(j['minAppVersion'], '1.0.0'),
        publishedVacancies: _i(j['publishedVacancies']) ?? 0,
      );
}
