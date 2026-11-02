/*
  Warnings:

  - A unique constraint covering the columns `[channelUserId,heroId]` on the table `UserHero` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserHero_channelUserId_key";

-- AlterTable
ALTER TABLE "UserHero" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "UserHero_channelUserId_heroId_key" ON "UserHero"("channelUserId", "heroId");

-- Единственный бэкфилл: у каждого зрителя сейчас ровно одна строка, и она - его действующий герой.
UPDATE "UserHero" SET "isActive" = true;

-- Prisma не выражает частичный индекс в схеме. Он и держит "не больше одного активного".
CREATE UNIQUE INDEX "UserHero_one_active_per_user"
  ON "UserHero" ("channelUserId") WHERE "isActive";
