import type { VacancySource } from "@/generated/prisma/client";
import type { SourceAdapter } from "../types";
import { remotive } from "./remotive";
import { jobicy } from "./jobicy";
import { remoteok } from "./remoteok";
import { himalayas } from "./himalayas";
import { arbeitnow } from "./arbeitnow";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { ashby } from "./ashby";

export const ADAPTERS: SourceAdapter[] = [remotive, jobicy, remoteok, himalayas, arbeitnow, greenhouse, lever, ashby];

export const ADAPTER_BY_SOURCE = Object.fromEntries(ADAPTERS.map((a) => [a.source, a])) as Record<
  Exclude<VacancySource, "MANUAL">,
  SourceAdapter
>;

export const IMPORT_SOURCES = ADAPTERS.map((a) => a.source);

export function isImportSource(v: string): v is Exclude<VacancySource, "MANUAL"> {
  return v in ADAPTER_BY_SOURCE;
}
