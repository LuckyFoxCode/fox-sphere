/*
  Warnings:

  - A unique constraint covering the columns `[redemptionId]` on the table `CoinHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CoinHistory" ADD COLUMN     "redemptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CoinHistory_redemptionId_key" ON "CoinHistory"("redemptionId");
