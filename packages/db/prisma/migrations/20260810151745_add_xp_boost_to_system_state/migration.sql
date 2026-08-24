-- AlterTable
ALTER TABLE "SystemState" ADD COLUMN     "xpBoostExpiresAt" TIMESTAMP(3),
ADD COLUMN     "xpBoostMultiplier" INTEGER NOT NULL DEFAULT 1;
