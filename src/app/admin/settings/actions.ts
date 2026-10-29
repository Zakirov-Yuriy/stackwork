"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { saveImportSettings, normalizeImportSettings } from "@/lib/import/settings";

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveImportSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");

  const next = normalizeImportSettings({
    enabledSources: formData.getAll("enabledSources").map(String),
    requireSalary: formData.get("requireSalary") === "on",
    remoteOnly: formData.get("remoteOnly") === "on",
    languages: lines(formData.get("languages")),
    maxPerSource: Number(formData.get("maxPerSource")),
    maxAgeDays: Number(formData.get("maxAgeDays")),
    autoPublish: formData.get("autoPublish") === "on",
    greenhouseBoards: lines(formData.get("greenhouseBoards")),
    leverCompanies: lines(formData.get("leverCompanies")),
    ashbyBoards: lines(formData.get("ashbyBoards")),
  });
  await saveImportSettings(next);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/import");
  redirect("/admin/settings?saved=1");
}
