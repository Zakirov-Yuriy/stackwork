-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VacancySource" AS ENUM ('MANUAL', 'REMOTIVE', 'JOBICY', 'REMOTEOK', 'HIMALAYAS', 'ARBEITNOW', 'GREENHOUSE', 'LEVER', 'ASHBY');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('MONTH', 'YEAR', 'HOUR');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'OK', 'ERROR');

-- CreateEnum
CREATE TYPE "ImportTrigger" AS ENUM ('CRON', 'ADMIN');

-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('HOME', 'VACANCY', 'COMPANY', 'AUTH', 'EMPLOYER', 'APPLY', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nameKey" TEXT;

-- AlterTable
ALTER TABLE "Vacancy" ADD COLUMN     "applyUrl" TEXT,
ADD COLUMN     "descriptionHtml" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "locationNote" TEXT,
ADD COLUMN     "salaryPeriod" "SalaryPeriod" NOT NULL DEFAULT 'MONTH',
ADD COLUMN     "source" "VacancySource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "CompanyClaim" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "source" "VacancySource" NOT NULL,
    "trigger" "ImportTrigger" NOT NULL,
    "triggeredBy" TEXT,
    "status" "ImportRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "archived" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "notes" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "kind" "PageKind" NOT NULL,
    "vacancyId" TEXT,
    "visitorHash" TEXT NOT NULL,
    "device" "DeviceKind" NOT NULL,
    "referrerHost" TEXT,
    "from" TEXT,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "CompanyClaim_status_idx" ON "CompanyClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyClaim_companyId_userId_key" ON "CompanyClaim"("companyId", "userId");

-- CreateIndex
CREATE INDEX "ImportRun_source_startedAt_idx" ON "ImportRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "ImportRun_startedAt_idx" ON "ImportRun"("startedAt");

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");

-- CreateIndex
CREATE INDEX "PageView_day_visitorHash_idx" ON "PageView"("day", "visitorHash");

-- CreateIndex
CREATE INDEX "PageView_vacancyId_day_idx" ON "PageView"("vacancyId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Company_nameKey_key" ON "Company"("nameKey");

-- CreateIndex
CREATE INDEX "Vacancy_source_lastSeenAt_idx" ON "Vacancy"("source", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_source_externalId_key" ON "Vacancy"("source", "externalId");

-- AddForeignKey
ALTER TABLE "CompanyClaim" ADD CONSTRAINT "CompanyClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyClaim" ADD CONSTRAINT "CompanyClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
