-- CreateTable
CREATE TABLE "Viewer" (
    "id" TEXT NOT NULL,
    "twitchId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelUser" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lvl" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isMod" BOOLEAN NOT NULL DEFAULT false,
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "isSubscriber" BOOLEAN NOT NULL DEFAULT false,
    "isPermanentVip" BOOLEAN NOT NULL DEFAULT false,
    "spinsCount" INTEGER NOT NULL DEFAULT 0,
    "totalWin" INTEGER NOT NULL DEFAULT 0,
    "totalLoss" INTEGER NOT NULL DEFAULT 0,
    "xpThisWeek" INTEGER NOT NULL DEFAULT 0,
    "hasTicket" BOOLEAN NOT NULL DEFAULT false,
    "isLuckyVip" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChannelUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Viewer_twitchId_key" ON "Viewer"("twitchId");

-- CreateIndex
CREATE INDEX "ChannelUser_channelId_xp_idx" ON "ChannelUser"("channelId", "xp");

-- CreateIndex
CREATE INDEX "ChannelUser_channelId_coins_idx" ON "ChannelUser"("channelId", "coins");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelUser_channelId_viewerId_key" ON "ChannelUser"("channelId", "viewerId");

-- AddForeignKey
ALTER TABLE "ChannelUser" ADD CONSTRAINT "ChannelUser_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelUser" ADD CONSTRAINT "ChannelUser_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
