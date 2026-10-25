import "server-only";
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

/** Простой адаптивный шаблон: заголовок, абзацы, одна кнопка. */
export function renderMail(opts: { title: string; paragraphs: string[]; button?: { label: string; url: string }; footer?: string }): Pick<Mail, "text" | "html"> {
  const { title, paragraphs, button, footer } = opts;
  const text = [title, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.url}`] : []), "", footer ?? "Stackwork · IT-вакансии с указанной зарплатой"].join("\n");
  const html = `<!doctype html><html lang="ru"><body style="margin:0;background:#e8ebf0;font-family:Manrope,Segoe UI,Arial,sans-serif;color:#2b3140">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8ebf0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#f1f3f7;border-radius:20px;padding:32px;box-shadow:0 8px 24px rgba(60,70,90,.12)">
<tr><td style="font-weight:800;font-size:20px;padding-bottom:12px">&lt;/&gt; stackwork</td></tr>
<tr><td style="font-weight:800;font-size:22px;line-height:1.25;padding-bottom:12px">${esc(title)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:15px;line-height:1.55;padding-bottom:12px">${esc(p)}</td></tr>`).join("")}
${button ? `<tr><td style="padding:8px 0 16px"><a href="${button.url}" style="display:inline-block;background:linear-gradient(135deg,#5a8df2,#2d62d0);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 24px;border-radius:12px">${esc(button.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#6b7280;line-height:1.5;padding-bottom:8px">Если кнопка не работает, откройте ссылку: <br><a href="${button.url}" style="color:#3b6fd9;word-break:break-all">${button.url}</a></td></tr>` : ""}
<tr><td style="font-size:12px;color:#6b7280;padding-top:12px;border-top:1px solid #d9dee6">${esc(footer ?? "Stackwork · IT-вакансии с указанной зарплатой")}</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

export function verifyEmailMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Подтвердите почту на Stackwork",
    ...renderMail({
      title: "Подтвердите почту",
      paragraphs: ["Вы зарегистрировались на Stackwork. Нажмите кнопку, чтобы подтвердить адрес: после этого можно откликаться на вакансии и публиковать свои.", "Ссылка действует 24 часа."],
      button: { label: "Подтвердить почту", url },
      footer: "Если вы не регистрировались на Stackwork, просто удалите это письмо.",
    }),
  };
}

export function resetPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Сброс пароля на Stackwork",
    ...renderMail({
      title: "Сброс пароля",
      paragraphs: ["Кто-то (надеемся, вы) запросил сброс пароля для этого адреса. Нажмите кнопку и задайте новый пароль.", "Ссылка действует 1 час и работает один раз."],
      button: { label: "Задать новый пароль", url },
      footer: "Если вы не запрашивали сброс, ничего делать не нужно: пароль не изменится.",
    }),
  };
}

export function newApplicationMail(to: string, opts: { vacancyTitle: string; candidateName: string; url: string }): Mail {
  return {
    to,
    subject: `Новый отклик: ${opts.vacancyTitle}`,
    ...renderMail({
      title: "Новый отклик на вакансию",
      paragraphs: [`${opts.candidateName} откликнулся на «${opts.vacancyTitle}».`, "Резюме, ссылка на GitHub и сопроводительное письмо в кабинете."],
      button: { label: "Открыть отклики", url: opts.url },
    }),
  };
}

export function applicationStatusMail(to: string, opts: { vacancyTitle: string; companyName: string; statusLabel: string; url: string }): Mail {
  return {
    to,
    subject: `${opts.companyName}: ${opts.statusLabel} по вакансии «${opts.vacancyTitle}»`,
    ...renderMail({
      title: "Статус отклика изменился",
      paragraphs: [`${opts.companyName} обновил статус вашего отклика на «${opts.vacancyTitle}»: ${opts.statusLabel}.`],
      button: { label: "Открыть вакансию", url: opts.url },
    }),
  };
}

export function moderationResultMail(to: string, opts: { vacancyTitle: string; approved: boolean; comment?: string | null; url: string }): Mail {
  return {
    to,
    subject: opts.approved ? `Вакансия опубликована: ${opts.vacancyTitle}` : `Вакансия не прошла модерацию: ${opts.vacancyTitle}`,
    ...renderMail({
      title: opts.approved ? "Вакансия опубликована" : "Вакансия не прошла модерацию",
      paragraphs: opts.approved
        ? [`«${opts.vacancyTitle}» прошла модерацию и видна в поиске. Отклики будут приходить в кабинет и на эту почту.`]
        : [`«${opts.vacancyTitle}» отклонена модератором.`, ...(opts.comment ? [`Причина: ${opts.comment}`] : []), "Поправьте вакансию и отправьте снова."],
      button: { label: opts.approved ? "Открыть вакансию" : "Открыть в редакторе", url: opts.url },
    }),
  };
}
