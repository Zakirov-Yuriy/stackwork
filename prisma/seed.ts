import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type Grade,
  type WorkFormat,
  type Employment,
  type ExperienceLevel,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// Тестовые аккаунты (только для локальной разработки, пароль у всех: password123)
const USERS = [
  { email: "admin@stackwork.local", name: "Администратор", role: "ADMIN" as const, company: null },
  { email: "employer@stackwork.local", name: "Ирина, HR Квант Банк", role: "EMPLOYER" as const, company: "kvant-bank" },
  { email: "candidate@stackwork.local", name: "Тест Кандидат", role: "CANDIDATE" as const, company: null },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// ───────────────────────────── Справочники ─────────────────────────────

const SKILLS = [
  "Go",
  "Python",
  "TypeScript",
  "Java",
  "Kotlin",
  "C#",
  "React",
  "Kubernetes",
  "PostgreSQL",
  "Kafka",
  "gRPC",
  "Redis",
  "Docker",
  "ClickHouse",
  "NATS",
  "Terraform",
  "Prometheus",
  "FastAPI",
  "Airflow",
  "GitLab CI",
];

const COMPANIES = [
  {
    slug: "kvant-bank",
    name: "Квант Банк",
    initials: "КБ",
    industry: "Финтех",
    city: "Москва",
    description:
      "Банк для бизнеса с собственной платёжной платформой. Инженерная команда около 200 человек.",
  },
  {
    slug: "orbita-market",
    name: "Орбита Маркет",
    initials: "ОМ",
    industry: "E-commerce",
    city: "Москва",
    description: "Маркетплейс товаров для дома с собственной логистикой.",
  },
  {
    slug: "greenlight",
    name: "Гринлайт",
    initials: "ГЛ",
    industry: "Телеком",
    city: "Санкт-Петербург",
    description: "Оператор связи, биллинг и highload-сервисы для B2B.",
  },
  {
    slug: "linetech",
    name: "Лайнтех",
    initials: "ЛТ",
    industry: "SaaS",
    city: "Москва",
    description: "Платформа для автоматизации процессов в логистике.",
  },
  {
    slug: "braincore",
    name: "Брейнкор",
    initials: "БК",
    industry: "ML / AI",
    city: "Новосибирск",
    description: "ML-платформа для анализа данных промышленных предприятий.",
  },
];

type VacancySeed = {
  slug: string;
  title: string;
  company: string;
  direction: string;
  grade: Grade;
  experience: ExperienceLevel;
  workFormat: WorkFormat;
  employment: Employment;
  city?: string;
  salaryFrom?: number;
  salaryTo?: number;
  skills: string[];
  acceptsGithubLink?: boolean;
  aboutTeam?: string;
  responsibilities?: string;
  requirements?: string;
  niceToHave?: string;
  conditions?: string;
  hoursAgo: number;
};

const VACANCIES: VacancySeed[] = [
  {
    slug: "senior-go-razrabotchik-platforma-platezhey",
    title: "Senior Go-разработчик (платформа платежей)",
    company: "kvant-bank",
    direction: "Backend",
    grade: "SENIOR",
    experience: "SIX_PLUS",
    workFormat: "REMOTE_OR_OFFICE",
    employment: "FULL_TIME",
    city: "Москва",
    salaryFrom: 350_000,
    salaryTo: 450_000,
    skills: ["Go", "PostgreSQL", "Kafka", "Kubernetes", "gRPC", "Redis", "Prometheus", "GitLab CI"],
    aboutTeam:
      "Платформа платежей обрабатывает переводы между клиентами банка и внешними сервисами. Команда из восьми инженеров отвечает за ядро проведения платежей, антифрод-интеграции и внутренние API для продуктовых команд.\n\nИщем разработчика, который возьмёт на себя сервисы маршрутизации платежей и будет участвовать в архитектурных решениях.",
    responsibilities:
      "Проектировать и разрабатывать сервисы на Go с нагрузкой в тысячи запросов в секунду\nРазвивать событийную архитектуру на Kafka: схемы, идемпотентность, повторная обработка\nПисать интеграции с платёжными системами и банковскими шлюзами по gRPC и REST\nУчаствовать в код-ревью, дизайн-ревью и планировании спринтов\nПоддерживать наблюдаемость: метрики, трейсинг, алерты",
    requirements:
      "Коммерческий опыт разработки на Go от 4 лет\nУверенная работа с PostgreSQL: индексы, планы запросов, транзакции\nОпыт с Kafka или другим брокером сообщений в продакшене\nПонимание распределённых систем: консистентность, ретраи, таймауты, circuit breaker\nОпыт работы с Kubernetes на уровне разработчика",
    niceToHave:
      "Опыт в финтехе или с платёжными протоколами\nЗнание требований ЦБ и 152-ФЗ к хранению и обработке данных\nВклад в open source на Go",
    conditions:
      "Вилка 350 000 до 450 000 ₽ на руки, пересмотр два раза в год\nУдалённо из любого региона РФ или офис у м. Павелецкая\nОформление по ТК РФ, ДМС со стоматологией после испытательного срока\nТехника на выбор, бюджет на обучение и конференции",
    hoursAgo: 2,
  },
  {
    slug: "middle-go-razrabotchik-logistika",
    title: "Middle Go-разработчик в команду логистики",
    company: "orbita-market",
    direction: "Backend",
    grade: "MIDDLE",
    experience: "THREE_TO_SIX",
    workFormat: "REMOTE",
    employment: "FULL_TIME",
    salaryFrom: 230_000,
    salaryTo: 290_000,
    skills: ["Go", "PostgreSQL", "Redis", "Docker"],
    acceptsGithubLink: true,
    aboutTeam:
      "Команда логистики отвечает за расчёт сроков доставки, маршрутизацию заказов по складам и интеграции с курьерскими службами.",
    responsibilities:
      "Разрабатывать сервисы расчёта доставки на Go\nИнтегрировать API курьерских служб и постаматов\nОптимизировать запросы к PostgreSQL под рост нагрузки",
    requirements:
      "Опыт разработки на Go от 2 лет\nPostgreSQL и Redis в продакшене\nПонимание Docker и CI/CD",
    conditions:
      "Удалённо из РФ\nОформление по ТК РФ или ИП на выбор\nДМС после испытательного срока",
    hoursAgo: 5,
  },
  {
    slug: "backend-razrabotchik-go-highload-billing",
    title: "Backend-разработчик Go (highload, биллинг)",
    company: "greenlight",
    direction: "Backend",
    grade: "MIDDLE",
    experience: "THREE_TO_SIX",
    workFormat: "HYBRID",
    employment: "FULL_TIME",
    city: "Санкт-Петербург",
    salaryFrom: 300_000,
    skills: ["Go", "ClickHouse", "NATS", "gRPC"],
    aboutTeam:
      "Биллинг обрабатывает десятки тысяч событий в секунду и считает списания для B2B-клиентов в реальном времени.",
    responsibilities:
      "Развивать сервисы тарификации на Go\nПроектировать хранение событий в ClickHouse\nУчаствовать в дежурствах по SLA",
    requirements:
      "Go от 3 лет, опыт с highload\nClickHouse или другая колоночная БД\nБрокеры сообщений: NATS, Kafka или RabbitMQ",
    conditions:
      "Гибрид: 2 дня в офисе в Санкт-Петербурге\nОт 300 000 ₽ на руки, обсуждается по итогам интервью\nДМС, спорт, обучение",
    hoursAgo: 26,
  },
  {
    slug: "go-razrabotchik-mikroservisy-kubernetes",
    title: "Go-разработчик (микросервисы, Kubernetes)",
    company: "linetech",
    direction: "Backend",
    grade: "MIDDLE",
    experience: "THREE_TO_SIX",
    workFormat: "REMOTE",
    employment: "FULL_TIME",
    salaryFrom: 250_000,
    salaryTo: 320_000,
    skills: ["Go", "Kubernetes", "Terraform", "Prometheus"],
    aboutTeam:
      "Платформенная команда строит внутреннюю инфраструктуру для продуктовых команд: деплой, мониторинг, сервис-меш.",
    responsibilities:
      "Разрабатывать внутренние сервисы и операторы для Kubernetes на Go\nПоддерживать инфраструктуру как код в Terraform\nНастраивать метрики и алерты в Prometheus",
    requirements:
      "Go от 2 лет\nKubernetes на уровне разработчика или выше\nTerraform, Helm",
    conditions: "Удалённо из РФ\nОформление по ТК РФ\nТехника за счёт компании",
    hoursAgo: 30,
  },
  {
    slug: "go-python-razrabotchik-ml-platforma",
    title: "Go + Python разработчик (ML-платформа)",
    company: "braincore",
    direction: "Data / ML",
    grade: "MIDDLE",
    experience: "THREE_TO_SIX",
    workFormat: "REMOTE_OR_OFFICE",
    employment: "FULL_TIME",
    city: "Новосибирск",
    salaryFrom: 200_000,
    salaryTo: 260_000,
    skills: ["Go", "Python", "FastAPI", "Airflow"],
    aboutTeam:
      "Команда платформы готовит данные и запускает ML-модели для промышленных клиентов. Сервисы на Go и Python, пайплайны на Airflow.",
    responsibilities:
      "Разрабатывать API для моделей на FastAPI и Go\nСтроить пайплайны обработки данных в Airflow\nСопровождать модели в продакшене",
    requirements:
      "Python от 3 лет, Go от 1 года\nОпыт с Airflow или аналогами\nПонимание жизненного цикла ML-моделей",
    conditions:
      "Удалённо или офис в Новосибирске\nОформление по ТК РФ\nГибкий график",
    hoursAgo: 50,
  },
  {
    slug: "senior-go-engineer-platezhnyy-shlyuz",
    title: "Senior Go Engineer, платёжный шлюз",
    company: "orbita-market",
    direction: "Backend",
    grade: "SENIOR",
    experience: "SIX_PLUS",
    workFormat: "REMOTE",
    employment: "FULL_TIME",
    salaryFrom: 380_000,
    salaryTo: 420_000,
    skills: ["Go", "PostgreSQL", "Kafka", "Redis"],
    aboutTeam:
      "Платёжный шлюз маркетплейса: приём оплат, сплит выплат продавцам, сверки с банками.",
    responsibilities:
      "Проектировать сервисы платёжного шлюза\nОбеспечивать идемпотентность и консистентность платежей\nМенторить middle-разработчиков",
    requirements:
      "Go от 5 лет\nОпыт с платежами или финтехом\nKafka, PostgreSQL в highload",
    conditions: "Удалённо из РФ\nОформление по ТК РФ\nОпционы",
    hoursAgo: 70,
  },
];

// ───────────────────────────── Загрузка ─────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Seeding skills…");
  const skillBySlug = new Map<string, string>();
  for (const name of SKILLS) {
    const slug = slugify(name);
    const skill = await db.skill.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
    skillBySlug.set(name, skill.id);
  }

  console.log("Seeding companies…");
  const companyBySlug = new Map<string, string>();
  for (const c of COMPANIES) {
    const company = await db.company.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    companyBySlug.set(c.slug, company.id);
  }

  console.log("Seeding vacancies…");
  for (const v of VACANCIES) {
    const companyId = companyBySlug.get(v.company);
    if (!companyId) throw new Error(`Unknown company ${v.company}`);
    const publishedAt = new Date(Date.now() - v.hoursAgo * 3600_000);
    const data = {
      title: v.title,
      companyId,
      direction: v.direction,
      grade: v.grade,
      experience: v.experience,
      workFormat: v.workFormat,
      employment: v.employment,
      city: v.city ?? null,
      salaryFrom: v.salaryFrom ?? null,
      salaryTo: v.salaryTo ?? null,
      acceptsGithubLink: v.acceptsGithubLink ?? false,
      aboutTeam: v.aboutTeam ?? null,
      responsibilities: v.responsibilities ?? null,
      requirements: v.requirements ?? null,
      niceToHave: v.niceToHave ?? null,
      conditions: v.conditions ?? null,
      status: "PUBLISHED" as const,
      publishedAt,
    };
    const vacancy = await db.vacancy.upsert({
      where: { slug: v.slug },
      update: data,
      create: { slug: v.slug, ...data },
    });
    await db.vacancySkill.deleteMany({ where: { vacancyId: vacancy.id } });
    await db.vacancySkill.createMany({
      data: v.skills.map((name, order) => {
        const skillId = skillBySlug.get(name);
        if (!skillId) throw new Error(`Unknown skill ${name}`);
        return { vacancyId: vacancy.id, skillId, order };
      }),
    });
  }

  console.log("Seeding test users…");
  const passwordHash = await hashPassword("password123");
  for (const u of USERS) {
    const companyId = u.company ? companyBySlug.get(u.company) : undefined;
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, companyId: companyId ?? null, emailVerifiedAt: new Date() },
      create: { email: u.email, name: u.name, role: u.role, passwordHash, companyId: companyId ?? null, emailVerifiedAt: new Date() },
    });
  }

  const count = await db.vacancy.count();
  console.log(`Done. Vacancies in DB: ${count}. Test users: ${USERS.map((u) => u.email).join(", ")} (password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
