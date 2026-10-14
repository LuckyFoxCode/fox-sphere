/**
 * Release A backfill: copy the legacy global `User` balances into the
 * channel-scoped `Viewer` / `ChannelUser` pair.
 *
 * Additive by design — it reads `User` / `UserLottery` and writes only the new
 * tables.
 *
 *   pnpm --filter bot-runtime backfill:channels [login] [--sync]
 *
 * STATUS AS OF THE RELEASE B CUTOVER (v1.16.0): `User` and `UserLottery` are
 * frozen and nothing in the bot reads or writes them any more. The bot's single
 * writer is `ChannelUser`, the panel reads `ChannelUser`, and there is no sync
 * between the two systems. Every statement below about "the running bot" having
 * been on `User` describes the release that shipped before this one; read them
 * as history, not as the current shape.
 *
 * The default mode is insert-only, and now that means insert-only everywhere: a
 * `ChannelUser` row that already exists is never written, and an existing
 * `Viewer` is never renamed. That is why the script can stay in `deploy.yml` —
 * after the cutover a deploy-time run finds every row already present, inserts
 * none of them, changes no balance and reverts no nickname. Where the balances
 * are concerned the default mode is a structural no-op rather than a decision:
 * no update path to one is reachable from it.
 *
 * The one write it can still make is a `Channel` row, when none matches the
 * login, which keeps the login resolvable. That goes away with the legacy
 * tables, which is to say with this script.
 *
 * ── `--sync` IS DESTRUCTIVE NOW. DO NOT RUN IT. ────────────────────────────────────
 *
 * There is exactly one safe moment left for it: immediately after the new bot
 * container is up and before acceptance testing, as the manual run in the
 * release checklist. Until then `User` still holds the last values the old bot
 * wrote, so a single `--sync` reconciles the drift the old bot accumulated
 * during the deploy window and leaves `ChannelUser` holding the live balances.
 *
 * Once that run has happened, or once the bot has been running long enough that
 * chat has moved `ChannelUser` on, `User` is a stale snapshot of the past.
 * `--sync` upserts all 14 copied fields over every row it builds, so it will
 * overwrite the live balance with that snapshot — a week of earnings, reverted,
 * silently. The `sum(coins)` check at the end of the branch reports a drop
 * AFTER the rows are committed; it is a signal, never a guard, and a drop is
 * exactly the shape of the damage. Treat it as one-way: the flag exists because
 * the cutover needs one manual run, and nothing needs it twice.
 *
 * `--sync` is also the only path that still writes `Viewer.username`, and that
 * is the other half of why it has to happen: see the `upsert` in `backfill()`.
 *
 * The count/sum report is the whole verification story, because there is no
 * other automated check on this script. Read it as `count(User)` and
 * `sum(coins) User` from the `before` report — one snapshot, taken before the
 * copy loop — against `count(ChannelUser)` and `sum(coins) ChannelUser` from the
 * `after` report. Both sides are table-wide counts, and they agree only while the copy
 * still writes every row it builds — that is, while no `ChannelUser` row pre-exists yet —
 * and then only to within the handful of queries between that snapshot and the `findMany`
 * the copy reads from. From the second run onward the comparison is not a check: insert-only
 * skips every row that is already there while the live bot keeps moving `User`, so the sums
 * cannot agree, and the gap grows with every chat message in between. Treat the two `after`
 * numbers as something to read, not something that proves anything.
 *
 * Do NOT compare the `after` report's own `User` side against `ChannelUser`.
 * After the cutover `User` is frozen, so the two are expected to differ by
 * everything the bot has done since — every chat message moves `xp`, a spin
 * moves `coins`, a new chatter adds a row. The default mode never reconciles the
 * two afterwards, which is correct: `ChannelUser` is the balance and `User` is
 * a dead copy kept only until the legacy tables are dropped.
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
    // WHY THE DEFAULT PATH DOES NOT WRITE `username`.
    //
    // `row.username` comes out of `User`, which the Release B cutover froze. A frozen
    // snapshot is now the older of two values: `ensureViewer`
    // (`src/modules/channel/channel-user.ts`) writes `Viewer.username` on a changed
    // login, so the live name the bot maintains itself is current, and nothing moves
    // `User` forward any more. Refreshing from it here would therefore revert every
    // renamed viewer's display name on every deploy, for the whole stream, until that
    // viewer typed again — visible in the chat widgets, the leaderboard, the lottery
    // participants list and the panel's viewer list, for ~94 viewers at a time. This is
    // the same reason `ChannelUser` is insert-only: a stale row is not a catch-up.
    //
    // `--sync` is the exception and has to keep the refresh, because that is the one
    // run that has not happened yet: `Viewer.username` has not been refreshed since the
    // Release A backfill, so for those viewers the frozen snapshot is the only name
    // there is, and it is correct as of the moment the old bot stopped writing `User`.
    //
    // An empty `update` is not a write that happens to be empty — Prisma emits no
    // UPDATE at all for it, resolving the conflict with reads alone and handing back
    // the existing row untouched. Measured against `foxsphere_test`: with `update: {}`
    // a second upsert of the same `twitchId` issues three SELECTs and no INSERT or
    // UPDATE, and returns the original `username`.
    const viewer = await prisma.viewer.upsert({
      where: { twitchId: row.twitchId },
      create: row,
      update: args.sync ? { username: row.username } : {},
    });

    viewerIdByTwitchId.set(row.twitchId, viewer.id);
  }

  console.log(`upserted ${viewerIdByTwitchId.size} Viewer row(s)`);

  const channelUserRows = buildChannelUserRows(users, lotteries, channel.id, viewerIdByTwitchId);

  if (args.sync) {
    // DESTRUCTIVE FROM THE RELEASE B CUTOVER ON — see the header. The one safe moment left
    // for this branch is the single manual run immediately after the new bot container comes
    // up, before acceptance testing; after that `User` is a stale snapshot and this upserts
    // all 14 copied fields over live balances. No bot code reads `User` any more, so nothing
    // will move it forward again and nothing will notice the roll-back.
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
    // protection was always that the default mode has no overwrite path at
    // all; this only makes a manual `--sync` loud when `User` had already fallen
    // behind — which, after the cutover, it always has.
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
