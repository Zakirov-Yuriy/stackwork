import "server-only";
import type { Locale } from "@/i18n/routing";
import nodemailer from "nodemailer";

/**
 * Отправка писем. Транспорт выбирается по окружению:
 *  - заданы SMTP_HOST/SMTP_USER/SMTP_PASS → реальная отправка через SMTP
 *    (подходит любой провайдер: Resend, Brevo, Postmark, Mailgun, Яндекс 360);
 *  - иначе → письмо печатается в консоль dev-сервера, ссылки видны в терминале.
 */

export type Mail = { to: string; subject: string; text: string; html: string };

const FROM = process.env.MAIL_FROM ?? "Stackwork <no-reply@stackwork.local>";

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
}

const transport = smtpTransport();

export async function sendMail(mail: Mail): Promise<void> {
  if (!transport) {
    const links = [...mail.text.matchAll(/https?:\/\/\S+/g)].map((m) => m[0]);
    console.log(`[mail] to=${mail.to} subject="${mail.subject}"${links.length ? ` link=${links[0]}` : ""}`);
    return;
  }
  await transport.sendMail({ from: FROM, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

/** Не роняем запрос из-за почты: ошибку только логируем. */
export function sendMailSafe(mail: Mail): void {
  sendMail(mail).catch((e) => console.error("[mail] failed:", e instanceof Error ? e.message : e));
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

// ───────────────────────────── Шаблоны ─────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type MailText = {
  footer: string;
  linkHint: string;
  verify: { subject: string; title: string; p1: string; p2: string; button: string; footer: string };
  reset: { subject: string; title: string; p1: string; p2: string; button: string; footer: string };
  newApplication: { subject: (v: string) => string; title: string; p1: (name: string, v: string) => string; p2: string; button: string };
  status: { subject: (c: string, st: string, v: string) => string; title: string; p1: (c: string, v: string, st: string) => string; button: string };
  moderation: {
    subjectOk: (v: string) => string;
    subjectNo: (v: string) => string;
    titleOk: string;
    titleNo: string;
    ok: (v: string) => string;
    no: (v: string) => string;
    reason: (c: string) => string;
    fix: string;
    buttonOk: string;
    buttonNo: string;
  };
};

/** Тексты писем по языкам. Письмо уходит на языке, в котором пользователь работал на сайте. */
const TEXT: Record<Locale, MailText> = {
  ru: {
    footer: "Stackwork · IT-вакансии с указанной зарплатой",
    linkHint: "Если кнопка не работает, откройте ссылку:",
    verify: {
      subject: "Подтвердите почту на Stackwork",
      title: "Подтвердите почту",
      p1: "Вы зарегистрировались на Stackwork. Нажмите кнопку, чтобы подтвердить адрес: после этого можно откликаться на вакансии и публиковать свои.",
      p2: "Ссылка действует 24 часа.",
      button: "Подтвердить почту",
      footer: "Если вы не регистрировались на Stackwork, просто удалите это письмо.",
    },
    reset: {
      subject: "Сброс пароля на Stackwork",
      title: "Сброс пароля",
      p1: "Кто-то (надеемся, вы) запросил сброс пароля для этого адреса. Нажмите кнопку и задайте новый пароль.",
      p2: "Ссылка действует 1 час и работает один раз.",
      button: "Задать новый пароль",
      footer: "Если вы не запрашивали сброс, ничего делать не нужно: пароль не изменится.",
    },
    newApplication: {
      subject: (v) => `Новый отклик: ${v}`,
      title: "Новый отклик на вакансию",
      p1: (name, v) => `${name} откликнулся на «${v}».`,
      p2: "Резюме, ссылка на GitHub и сопроводительное письмо в кабинете.",
      button: "Открыть отклики",
    },
    status: {
      subject: (c, st, v) => `${c}: ${st} по вакансии «${v}»`,
      title: "Статус отклика изменился",
      p1: (c, v, st) => `${c} обновил статус вашего отклика на «${v}»: ${st}.`,
      button: "Открыть вакансию",
    },
    moderation: {
      subjectOk: (v) => `Вакансия опубликована: ${v}`,
      subjectNo: (v) => `Вакансия не прошла модерацию: ${v}`,
      titleOk: "Вакансия опубликована",
      titleNo: "Вакансия не прошла модерацию",
      ok: (v) => `«${v}» прошла модерацию и видна в поиске. Отклики будут приходить в кабинет и на эту почту.`,
      no: (v) => `«${v}» отклонена модератором.`,
      reason: (c) => `Причина: ${c}`,
      fix: "Поправьте вакансию и отправьте снова.",
      buttonOk: "Открыть вакансию",
      buttonNo: "Открыть в редакторе",
    },
  },
  en: {
    footer: "Stackwork · IT jobs with the salary shown",
    linkHint: "If the button does not work, open this link:",
    verify: {
      subject: "Confirm your email on Stackwork",
      title: "Confirm your email",
      p1: "You signed up on Stackwork. Press the button to confirm your address: after that you can apply to jobs and post your own.",
      p2: "The link is valid for 24 hours.",
      button: "Confirm email",
      footer: "If you did not sign up on Stackwork, just delete this email.",
    },
    reset: {
      subject: "Password reset on Stackwork",
      title: "Password reset",
      p1: "Someone (hopefully you) requested a password reset for this address. Press the button and set a new password.",
      p2: "The link is valid for 1 hour and works once.",
      button: "Set a new password",
      footer: "If you did not request a reset, no action is needed: your password stays the same.",
    },
    newApplication: {
      subject: (v) => `New application: ${v}`,
      title: "New application for your job",
      p1: (name, v) => `${name} applied for “${v}”.`,
      p2: "The CV, GitHub link and cover letter are in your dashboard.",
      button: "Open applications",
    },
    status: {
      subject: (c, st, v) => `${c}: ${st} for “${v}”`,
      title: "Your application status changed",
      p1: (c, v, st) => `${c} updated the status of your application for “${v}”: ${st}.`,
      button: "Open the job",
    },
    moderation: {
      subjectOk: (v) => `Job published: ${v}`,
      subjectNo: (v) => `Job did not pass moderation: ${v}`,
      titleOk: "Job published",
      titleNo: "Job did not pass moderation",
      ok: (v) => `“${v}” passed moderation and is visible in search. Applications will arrive in your dashboard and at this email.`,
      no: (v) => `“${v}” was rejected by a moderator.`,
      reason: (c) => `Reason: ${c}`,
      fix: "Fix the job and submit it again.",
      buttonOk: "Open the job",
      buttonNo: "Open in the editor",
    },
  },
};

function texts(locale: Locale): MailText {
  return TEXT[locale] ?? TEXT.ru;
}

/** Простой адаптивный шаблон: заголовок, абзацы, одна кнопка. */
export function renderMail(
  opts: { title: string; paragraphs: string[]; button?: { label: string; url: string }; footer?: string },
  locale: Locale = "ru",
): Pick<Mail, "text" | "html"> {
  const { title, paragraphs, button } = opts;
  const T = texts(locale);
  const footer = opts.footer ?? T.footer;
  const text = [title, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.url}`] : []), "", footer].join("\n");
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#e8ebf0;font-family:Manrope,Segoe UI,Arial,sans-serif;color:#2b3140">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8ebf0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#f1f3f7;border-radius:20px;padding:32px;box-shadow:0 8px 24px rgba(60,70,90,.12)">
<tr><td style="font-weight:800;font-size:20px;padding-bottom:12px"><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#e8ebf0;color:#3b6fd9;box-shadow:2px 2px 5px #c6cbd4,-2px -2px 5px #fff;margin-right:8px;vertical-align:middle">S</span>stackwork</td></tr>
<tr><td style="font-weight:800;font-size:22px;line-height:1.25;padding-bottom:12px">${esc(title)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:15px;line-height:1.55;padding-bottom:12px">${esc(p)}</td></tr>`).join("")}
${button ? `<tr><td style="padding:8px 0 16px"><a href="${button.url}" style="display:inline-block;background:linear-gradient(135deg,#5a8df2,#2d62d0);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 24px;border-radius:12px">${esc(button.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#6b7280;line-height:1.5;padding-bottom:8px">${esc(T.linkHint)} <br><a href="${button.url}" style="color:#3b6fd9;word-break:break-all">${button.url}</a></td></tr>` : ""}
<tr><td style="font-size:12px;color:#6b7280;padding-top:12px;border-top:1px solid #d9dee6">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

export function verifyEmailMail(to: string, url: string, locale: Locale = "ru"): Mail {
  const T = texts(locale).verify;
  return { to, subject: T.subject, ...renderMail({ title: T.title, paragraphs: [T.p1, T.p2], button: { label: T.button, url }, footer: T.footer }, locale) };
}

export function resetPasswordMail(to: string, url: string, locale: Locale = "ru"): Mail {
  const T = texts(locale).reset;
  return { to, subject: T.subject, ...renderMail({ title: T.title, paragraphs: [T.p1, T.p2], button: { label: T.button, url }, footer: T.footer }, locale) };
}

export function newApplicationMail(to: string, opts: { vacancyTitle: string; candidateName: string; url: string }, locale: Locale = "ru"): Mail {
  const T = texts(locale).newApplication;
  return {
    to,
    subject: T.subject(opts.vacancyTitle),
    ...renderMail({ title: T.title, paragraphs: [T.p1(opts.candidateName, opts.vacancyTitle), T.p2], button: { label: T.button, url: opts.url } }, locale),
  };
}

export function applicationStatusMail(
  to: string,
  opts: { vacancyTitle: string; companyName: string; statusLabel: string; url: string },
  locale: Locale = "ru",
): Mail {
  const T = texts(locale).status;
  return {
    to,
    subject: T.subject(opts.companyName, opts.statusLabel, opts.vacancyTitle),
    ...renderMail({ title: T.title, paragraphs: [T.p1(opts.companyName, opts.vacancyTitle, opts.statusLabel)], button: { label: T.button, url: opts.url } }, locale),
  };
}

export function moderationResultMail(
  to: string,
  opts: { vacancyTitle: string; approved: boolean; comment?: string | null; url: string },
  locale: Locale = "ru",
): Mail {
  const T = texts(locale).moderation;
  const v = opts.vacancyTitle;
  return {
    to,
    subject: opts.approved ? T.subjectOk(v) : T.subjectNo(v),
    ...renderMail(
      {
        title: opts.approved ? T.titleOk : T.titleNo,
        paragraphs: opts.approved ? [T.ok(v)] : [T.no(v), ...(opts.comment ? [T.reason(opts.comment)] : []), T.fix],
        button: { label: opts.approved ? T.buttonOk : T.buttonNo, url: opts.url },
      },
      locale,
    ),
  };
}
