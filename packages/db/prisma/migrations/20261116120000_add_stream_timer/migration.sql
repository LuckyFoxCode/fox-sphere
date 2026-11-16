-- AlterTable
ALTER TABLE "SystemState" ADD COLUMN     "timerColor" TEXT,
ADD COLUMN     "timerEndsAt" TIMESTAMP(3),
ADD COLUMN     "timerTitle" TEXT;
