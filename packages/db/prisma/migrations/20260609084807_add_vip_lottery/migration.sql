-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPermanentVip" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserLottery" (
    "id" SERIAL NOT NULL,
    "xpThisWeek" INTEGER NOT NULL DEFAULT 0,
    "hasTicket" BOOLEAN NOT NULL DEFAULT false,
    "isLuckyVip" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserLottery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLottery_userId_key" ON "UserLottery"("userId");

-- CreateIndex
CREATE INDEX "UserLottery_userId_idx" ON "UserLottery"("userId");

-- AddForeignKey
ALTER TABLE "UserLottery" ADD CONSTRAINT "UserLottery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
