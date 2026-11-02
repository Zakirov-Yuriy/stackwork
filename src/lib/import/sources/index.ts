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
import { smartrecruiters } from "./smartrecruiters";
import { trudvsem } from "./trudvsem";
import { hackernews } from "./hackernews";

export const ADAPTERS: SourceAdapter[] = [trudvsem, hackernews, jobicy, remoteok, himalayas, arbeitnow, greenhouse, lever, ashby, smartrecruiters, remotive];

export const ADAPTER_BY_SOURCE = Object.fromEntries(ADAPTERS.map((a) => [a.source, a])) as Record<
  Exclude<VacancySource, "MANUAL">,
  SourceAdapter
>;

export const IMPORT_SOURCES = ADAPTERS.map((a) => a.source);

export function isImportSource(v: string): v is Exclude<VacancySource, "MANUAL"> {
  return v in ADAPTER_BY_SOURCE;
}
