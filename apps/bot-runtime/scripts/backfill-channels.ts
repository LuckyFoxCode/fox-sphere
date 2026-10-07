/**
 * Release A backfill: copy the legacy global `User` balances into the
 * channel-scoped `Viewer` / `ChannelUser` pair.
 *
 * Additive by design — it reads `User` / `UserLottery` and writes only the new
 * tables, so the running bot (which still reads `User`) is untouched.
 *
 * Idempotent: `Channel` is created only when absent, `Viewer` is upserted on
 * `twitchId`, `ChannelUser` on `(channelId, viewerId)`. A second run converges
 * to the same rows instead of failing.
 *
 *   pnpm --filter bot-runtime backfill:channels [login]
 *
 * The count/sum report is the whole verification story, because there is no
 * other automated check on this script: `count(User)` must equal
 * `count(ChannelUser)` and the two `sum(coins)` values must match.
 */
// Kept for the DATABASE_URL contract. Note this reads `process.cwd()/.env`, which
// is `apps/bot-runtime` - no `.env` there. What actually loads the repo-root
// `.env` is `@fox-sphere/backend-shared`'s `config`, reached through `prisma`,
// which resolves the root path from its own file rather than from cwd.
import "dotenv/config";
import { buildChannelUserRows, buildViewerRows, prisma } from "@fox-sphere/backend-shared";
import type { LegacyUser, LegacyUserLottery } from "@fox-sphere/backend-shared";

const LEGACY_LOGIN = process.env.TWITCH_CHANNEL_NAME ?? "luckyfoxcode";
const LEGACY_TWITCH_ID = process.env.TWITCH_USER_ID ?? "";

const login = process.argv[2] ?? LEGACY_LOGIN;

const reportCounts = async (label: string): Promise<void> => {
  const [userCount, userLotteryCount, viewerCount, channelUserCount, userSums, channelUserSums] =
    await Promise.all([
      prisma.user.count(),
      prisma.userLottery.count(),
      prisma.viewer.count(),
      prisma.channelUser.count(),
      prisma.user.aggregate({ _sum: { coins: true, xp: true } }),
      prisma.channelUser.aggregate({ _sum: { coins: true, xp: true } }),
    ]);

  console.log(`--- ${label} ---`);
  console.log(`  count(User)            = ${userCount}`);
  console.log(`  count(UserLottery)     = ${userLotteryCount}`);
  console.log(`  count(Viewer)          = ${viewerCount}`);
  console.log(`  count(ChannelUser)     = ${channelUserCount}`);
  console.log(`  sum(coins) User        = ${userSums._sum.coins ?? 0}`);
  console.log(`  sum(coins) ChannelUser = ${channelUserSums._sum.coins ?? 0}`);
  console.log(`  sum(xp) User           = ${userSums._sum.xp ?? 0}`);
  console.log(`  sum(xp) ChannelUser    = ${channelUserSums._sum.xp ?? 0}`);
};

const backfill = async (): Promise<void> => {
  await reportCounts("before");

  const channel =
    (await prisma.channel.findUnique({ where: { login } })) ??
    (await prisma.channel.create({
      data: { twitchId: LEGACY_TWITCH_ID, login, displayName: login, status: "ACTIVE" },
    }));

  console.log(`Channel "${channel.login}" -> ${channel.id}`);

  const users: LegacyUser[] = await prisma.user.findMany();

  // `twitchId` is not a column on `UserLottery` — the row keys on `userId` and
  // carries a `user` relation, so `twitchId` has to be projected explicitly.
  // Passing the raw Prisma rows would leave every `lottery.twitchId` undefined,
  // every lookup in the mapper would miss, and all three lottery columns would
  // be silently backfilled to their defaults.
  const lotteryRows = await prisma.userLottery.findMany({
    include: { user: { select: { twitchId: true } } },
  });
  const lotteries: LegacyUserLottery[] = lotteryRows.map((lottery) => ({
    twitchId: lottery.user.twitchId,
    xpThisWeek: lottery.xpThisWeek,
    hasTicket: lottery.hasTicket,
    isLuckyVip: lottery.isLuckyVip,
  }));

  const viewerIdByTwitchId = new Map<string, string>();
  for (const row of buildViewerRows(users)) {
    const viewer = await prisma.viewer.upsert({
      where: { twitchId: row.twitchId },
      update: { username: row.username },
      create: row,
    });

    viewerIdByTwitchId.set(row.twitchId, viewer.id);
  }

  console.log(`upserted ${viewerIdByTwitchId.size} Viewer row(s)`);

  const channelUserRows = buildChannelUserRows(users, lotteries, channel.id, viewerIdByTwitchId);

  for (const row of channelUserRows) {
    // `channelId` and `viewerId` are the lookup key, not carried balance data;
    // everything left over is one of the 14 fields the mapper produced.
    const { channelId, viewerId, ...balance } = row;

    await prisma.channelUser.upsert({
      where: { channelId_viewerId: { channelId, viewerId } },
      create: { channelId, viewerId, ...balance },
      update: balance,
    });
  }

  console.log(`upserted ${channelUserRows.length} ChannelUser row(s)`);

  await reportCounts("after");
};

try {
  await backfill();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}