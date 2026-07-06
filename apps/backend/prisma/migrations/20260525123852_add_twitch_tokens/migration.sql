-- CreateTable
CREATE TABLE "twitch_tokens" (
    "id" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresIn" INTEGER NOT NULL DEFAULT 0,
    "obtainmentTimestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "twitch_tokens_twitchUserId_key" ON "twitch_tokens"("twitchUserId");
