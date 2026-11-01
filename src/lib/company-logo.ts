import "server-only";
import sharp from "sharp";
import { db } from "@/lib/db";

/**
 * Логотип компании от работодателя. Файл приводится к квадрату 256×256 WebP
 * (прозрачные поля, если пропорции не квадратные), хранится в таблице CompanyLogo,
 * а в Company.logoUrl пишется адрес /api/company-logo/<id>?v=<время>, по которому
 * его показывают карточки вакансий, страница компании и админка.
 */

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_SIZE = 256;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);

export type LogoError = "type" | "size" | "broken";

export function logoUrlFor(companyId: string, updatedAt: Date): string {
  return `/api/company-logo/${companyId}?v=${updatedAt.getTime()}`;
}

/** Проверяет и перекодирует файл. Возвращает код ошибки или null. */
export async function saveCompanyLogo(companyId: string, file: File): Promise<LogoError | null> {
  if (!ALLOWED.has(file.type)) return "type";
  if (file.size === 0 || file.size > LOGO_MAX_BYTES) return "size";
  let data: Uint8Array<ArrayBuffer>;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // SVG растеризуем: в базе и на страницах только растровый WebP, без скриптов внутри картинки
    const out = await sharp(input, { density: 300, limitInputPixels: 40_000_000 })
      .rotate()
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88 })
      .toBuffer();
    data = new Uint8Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer);
  } catch {
    return "broken";
  }
  const logo = await db.companyLogo.upsert({
    where: { companyId },
    create: { companyId, data, mime: "image/webp" },
    update: { data, mime: "image/webp" },
    select: { updatedAt: true },
  });
  await db.company.update({ where: { id: companyId }, data: { logoUrl: logoUrlFor(companyId, logo.updatedAt) } });
  return null;
}

export async function removeCompanyLogo(companyId: string): Promise<void> {
  await db.companyLogo.deleteMany({ where: { companyId } });
  await db.company.update({ where: { id: companyId }, data: { logoUrl: null } });
}
