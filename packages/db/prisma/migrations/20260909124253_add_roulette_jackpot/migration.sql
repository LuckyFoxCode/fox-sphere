-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HistoryReason" ADD VALUE 'SPIN';
ALTER TYPE "HistoryReason" ADD VALUE 'SPIN_PRIZE';
ALTER TYPE "HistoryReason" ADD VALUE 'JACKPOT';

-- AlterTable
ALTER TABLE "SystemState" ADD COLUMN     "jackpotTotal" INTEGER NOT NULL DEFAULT 1000;
