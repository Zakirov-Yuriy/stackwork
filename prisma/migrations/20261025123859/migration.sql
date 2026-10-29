-- DropIndex
DROP INDEX "Vacancy_search_idx";

-- AlterTable
ALTER TABLE "Vacancy" ALTER COLUMN "search" DROP DEFAULT;
