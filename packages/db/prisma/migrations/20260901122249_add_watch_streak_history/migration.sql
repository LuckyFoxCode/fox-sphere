/*
  Warnings:

  - Changed the type of `reason` on the `CoinHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "HistoryReason" AS ENUM ('BOSS_REWARD', 'GIFT', 'LOTTERY', 'CHANGE_POINTS', 'WATCH_STREAK');

-- DropIndex
DROP INDEX "CoinHistory_userId_idx";

-- AlterTable
ALTER TABLE "CoinHistory" ADD COLUMN     "details" TEXT,
DROP COLUMN "reason",
ADD COLUMN     "reason" "HistoryReason" NOT NULL;

-- CreateTable
CREATE TABLE "XpHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "HistoryReason" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchStreak" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "streakValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XpHistory_userId_createdAt_idx" ON "XpHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchStreak_userId_streakValue_key" ON "WatchStreak"("userId", "streakValue");

-- CreateIndex
CREATE INDEX "CoinHistory_userId_createdAt_idx" ON "CoinHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "XpHistory" ADD CONSTRAINT "XpHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchStreak" ADD CONSTRAINT "WatchStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
