import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { getCurrentUser } from "@/lib/session";

/** GET /verify?token=… — подтверждение почты по ссылке из письма. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  if (!userId) {
    // Вошедшего ведём в его кабинет с пометкой, гостя на вход
    const current = await getCurrentUser();
    if (current?.emailVerifiedAt) redirect(`${current.role === "EMPLOYER" ? "/employer" : current.role === "ADMIN" ? "/admin" : "/me"}?verify=ok`);
    redirect("/login?verify=expired");
  }

  const user = await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() }, select: { role: true } });
  const current = await getCurrentUser();
  // Если человек вошёл в другой браузер, всё равно подтверждаем и ведём на вход
  if (!current || current.id !== userId) redirect("/login?verify=ok");
  redirect(`${user.role === "EMPLOYER" ? "/employer" : user.role === "ADMIN" ? "/admin" : "/me"}?verify=ok`);
}
