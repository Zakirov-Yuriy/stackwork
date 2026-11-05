-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('DIGEST', 'ARTICLE');

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "model" TEXT,
    "sentAt" TIMESTAMP(3),
    "messageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentDraft_kind_createdAt_idx" ON "ContentDraft"("kind", "createdAt");
