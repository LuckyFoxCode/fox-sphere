-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED');

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "twitchId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING',
    "botIsMod" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- The @unique on twitchId already provides the index; a separate @@index would
-- be a duplicate. (The first draft of this migration created both, and the next
-- one dropped the extra - squashed here since neither had reached production.)
CREATE UNIQUE INDEX "Channel_twitchId_key" ON "Channel"("twitchId");
