/**
 * Release A backfill: copy the legacy global `User` balances into the
 * channel-scoped `Viewer` / `ChannelUser` pair.
 *
 * Additive by design — it reads `User` / `UserLottery` and writes only the new
 * tables, so the running bot (which still reads `User`) is untouched.
 *
 *   pnpm --filter bot-runtime backfill:channels [login] [--sync]
 *
 * The default mode is insert-only: a `ChannelUser` row that already exists is
 * never written, so a frozen `User` cannot roll a live balance backwards. That
 * is why the script can stay in `deploy.yml` — after the Release B cutover
 * `User` stops being the source of truth, a deploy-time run finds every row
 * already present, inserts none of them and changes no balance. It is not a total
 * no-op, and deliberately so: `Viewer.username` is still refreshed from `User` on
 * every run, and a `Channel` is still created when none matches the login, because
 * a stale nickname is safer than a frozen one. Both go away with the legacy tables.
 * Where the balances are concerned the default mode is a structural no-op rather
 * than a decision: no update path to one is reachable from it.
 *
 * `--sync` is the only converging mode, a human has to ask for it by name, and
 * it is a migration step rather than a deploy step — run it by hand, as late as
 * you like before the cutover, to pull drift back from `User`. After the
 * cutover it is the dangerous direction, not the safe one.
 *
 * The count/sum report is the whole verification story, because there is no
 * other automated check on this script. Read it as `count(User)` and
 * `sum(coins) User` from the `before` report — one snapshot, taken before the
 * copy loop — against `count(ChannelUser)` and `sum(coins) ChannelUser` from the
 * `after` report. Both sides are table-wide counts, and while the bot still writes
 * `User` — that is, for every run before the Release B cutover — the two agree to
 * within the handful of queries between that snapshot and the `findMany` the copy
 * reads from. After the cutover they diverge arbitrarily and durably, and that is
 * the expected result rather than a symptom: insert-only mode exists precisely so
 * it will not reconcile them for you.
 *
 * Do NOT compare the `after` report's own `User` side against `ChannelUser`:
 * that read is fresh and the live bot is still writing `User` throughout, so on
 * an active stream the two legitimately differ — every chat message moves `xp`,
 * a spin moves `coins`, a new chatter adds a row — and the difference is
 * indistinguishable from a mapping bug. Nothing is lost either way: the default
 * mode never reconciles the two afterwards, which is correct — they are two
 * tables with two writers and they are meant to drift until the bot moves.
 */
// Kept for the DATABASE_URL contract. Note this reads `process.cwd()/.env`, which
// is `apps/bot-runtime` - no `.env` there. What actually loads the repo-root
// `.env` is `@fox-sphere/backend-shared`'s `config`, reached through `prisma`,
// which resolves the root path from its own file rather than from cwd.
import "dotenv/config";
import {
  buildChannelUserRows,
  buildViewerRows,
  channelUserKey,
  parseBackfillArgs,
  prisma,
  selectMissingRows,
} from "@fox-sphere/backend-shared";
import type { BackfillArgs, LegacyUser, LegacyUserLottery } from "@fox-sphere/backend-shared";

const LEGACY_LOGIN = process.env.TWITCH_CHANNEL_NAME ?? "luckyfoxcode";
const LEGACY_TWITCH_ID = process.env.TWITCH_USER_ID ?? "";

const args: BackfillArgs = parseBackfillArgs(process.argv.slice(2));

// A blank positional names a channel called "", which matches no row and
// backfills nothing in silence, so it falls back like an absent one does.
const requestedLogin = args.login?.trim() ?? "";
const login = requestedLogin === "" ? LEGACY_LOGIN : requestedLogin;

const reportCounts = async (
  label: string,
): Promise<{ userCoins: number; channelUserCoins: number }> => {
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

  return {
    userCoins: userSums._sum.coins ?? 0,
    channelUserCoins: channelUserSums._sum.coins ?? 0,
  };
};

const backfill = async (): Promise<void> => {
  const before = await reportCounts("before");

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

  if (args.sync) {
    // The only mode that converges, and the one that destroys data once the
    // cutover has happened: from that commit on, `User` is frozen and no longer
    // fed, every row built above already exists in `ChannelUser`, and the
    // default path below inserts none of them and cannot touch a live balance.
    // That is why this branch has to be asked for by name.
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

    const after = await reportCounts("after");

    // A signal after the write, not a guard against it: the rows above are
    // already committed, so a drop is reported, never prevented. The real
    // protection is the default mode having no overwrite path at all; this only
    // makes a manual `--sync` loud when `User` had already fallen behind.
    if (after.channelUserCoins < before.channelUserCoins) {
      throw new Error(
        `sum(coins) ChannelUser dropped from ${before.channelUserCoins} to ${after.channelUserCoins} during --sync`,
      );
    }

    return;
  }

  const existing = await prisma.channelUser.findMany({
    where: { channelId: channel.id },
    select: { viewerId: true },
  });
  const existingKeys = new Set(existing.map((row) => channelUserKey(channel.id, row.viewerId)));

  const missing = selectMissingRows(channelUserRows, existingKeys);

  if (missing.length > 0) {
    await prisma.channelUser.createMany({ data: missing });
  }

  console.log(`inserted ${missing.length} ChannelUser row(s)`);

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
