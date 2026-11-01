-- CreateTable
CREATE TABLE "TelegramPost" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" INTEGER,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "unlocked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelegramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPost_vacancyId_key" ON "TelegramPost"("vacancyId");

-- CreateIndex
CREATE INDEX "TelegramPost_postedAt_idx" ON "TelegramPost"("postedAt");

-- AddForeignKey
ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
