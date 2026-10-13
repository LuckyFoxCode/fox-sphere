/*
  Release B, step "tenant schema": repoint the four history tables from `User` to
  `ChannelUser`, so a balance's history is scoped by channel the way the balance itself
  now is (see `apps/bot-runtime/docs/multi-tenant-architecture.md`, phase 1 steps 2, 6
  and 14). The bot keeps writing to these four tables; only the key changes.

  `User` and `UserLottery` are deliberately left alone. They stay in the schema, frozen,
  and are dropped in their own migration at the end of phase 1 - so a rollback to the
  previous bot image still finds a readable `User`. They are read below and never written:
  every statement here targets `Viewer` or `ChannelUser`.

  WHY EVERYTHING BELOW IS ONE TRANSACTION

  The file opens its own `BEGIN` / `COMMIT`, because Prisma's migration engine does not
  provide one. `apply_script` runs the file statement by statement with no wrapping
  transaction on this connector, so a failure halfway down leaves every statement before
  it applied and nothing after it. That was measured, not assumed: running this file with
  one `User` whose viewer had no `ChannelUser` row failed on the `SET NOT NULL` below and
  left all four tables carrying the new columns and the new indexes while `_prisma_migrations`
  recorded the migration as failed with `finished_at` NULL. A half-applied state is not
  merely untidy - the next `migrate deploy` refuses to continue until an operator resolves
  the failure by hand, and re-running then fails on indexes that already exist.

  With the explicit transaction a failure rolls the whole thing back and the database
  matches the pre-migration schema again. It does not save the operator the
  `prisma migrate resolve --rolled-back` that Prisma demands after ANY failed migration -
  it saves them from having to repair the schema before that re-run can succeed.

  Atomicity is also what makes the deploy safe, and here the lock is what supplies it.
  `deploy.yml` runs `migrate:deploy` while the OLD bot container is still serving chat, and
  the old bot inserts into these very tables:

    - The first `ALTER TABLE` takes `ACCESS EXCLUSIVE` on a history table, and the lock is
      held until COMMIT. Every insert the old bot issues after that point blocks.
    - Under READ COMMITTED the `UPDATE` below takes its own fresh snapshot, so it sees
      every insert that committed before the lock was acquired, and none of the ones
      blocked behind it.
    - So there is no instant at which the old bot can write a row the backfill misses, and
      no instant at which it can read a half-moved table. Without the transaction, a lock
      released statement by statement is not a cutover at all.

  WHY THIS MIGRATION CREATES THE MISSING `Viewer` / `ChannelUser` ROWS

  It cannot simply refuse. `deploy.yml` runs this migration at line 106, `backfill:channels`
  at line 112 and `compose up -d` at line 119 - so the migration runs *before* the step that
  would fill the gap, and that step is insert-only by design: it creates absent rows and
  never updates an existing one. A viewer who has chatted since the last deploy therefore
  has a `User` with history rows and no `ChannelUser`, and refusing to remap such a row
  deadlocks the release against a step that cannot yet run, aborting under `set -e` before
  the new bot ever starts.

  Creating the rows is not inventing data, it is finishing the mapping this migration is
  already performing: these are exactly the rows the bot's own Release B code will write at
  that viewer's next message, and they carry the balance that viewer already has. The
  alternative - remapping onto nothing, or dropping the history - is what would be inventing.

  The field list is `apps/bot-runtime/scripts/backfill-channels.ts`'s, not a new one:
  `buildChannelUserRows` in `packages/backend-shared/src/backfill/channel-backfill.ts` maps
  eleven fields from `User` (`coins`, `lvl`, `xp`, `lastXpAt`, `isMod`, `isFounder`,
  `isSubscriber`, `isPermanentVip`, `spinsCount`, `totalWin`, `totalLoss`) and three from
  `UserLottery` (`xpThisWeek`, `hasTicket`, `isLuckyVip`), the last three defaulting to
  `NO_LOTTERY` when there is no lottery row. The two writes keep that script's modes as
  well: `Viewer` is upserted on `twitchId` (create, or refresh `username`), and
  `ChannelUser` is insert-only on `(channelId, viewerId)` - never updated. Updating an
  existing one would roll a live balance backwards out of a `User` the old bot is still
  writing, which is the one thing `selectMissingRows` exists to prevent.

  Scope is the `User`s that actually have rows in the four history tables. A `User` with no
  history needs no `ChannelUser`, and `backfill:channels` creates one for it on its next run.

  WHAT STILL ABORTS, AND WHY IT CANNOT BE PAPERED OVER

  The channel itself, but only when there is history to file. This migration resolves the
  single `Channel` row the legacy single-channel bot belonged to, and refuses when that row
  is not unambiguous: zero channels means there is nothing to scope the history to, and more
  than one means any choice would silently file a viewer's history under the wrong channel.
  Neither is something this file may guess at - `Channel` is configuration, not data to be
  derived.

  Why the condition is "history AND no unambiguous channel" rather than just "no
  unambiguous channel": an empty database is not a misconfiguration. `.github/workflows/ci.yml`
  creates a brand-new empty `foxsphere_test` and migrates the whole chain over it, and a
  first run on a fresh clone (`pnpm prisma:m`) does the same, so requiring a `Channel` row
  unconditionally makes this schema un-migratable on any empty database - it would turn the
  `gate` job red on every PR and break the documented first run. Nothing in the migration
  chain seeds a `Channel` row, so an empty database has none.

  With no history rows there is nothing to misfile: both `INSERT`s select from `User` rows
  that do not exist, every `UPDATE` matches nothing, and the remap is a no-op. The one place
  the empty case could still bite is the `ChannelUser` INSERT's scalar subquery, which yields
  NULL when `Channel` is empty - but with no candidate rows it is never evaluated per row and
  no NOT NULL check ever happens. An assertion that fires when there is nothing to assert is
  not a safety check; it is an obstacle.

  WHY THE PREFLIGHT IS OUTSIDE THE TRANSACTION

  Inside one, its message would be thrown away. Postgres keeps only the first error of a
  transaction: once a statement fails, every later command - including `COMMIT` - answers
  "current transaction is aborted, commands ignored until end of transaction block", and
  that is the text the operator ends up reading. The preflight therefore runs first, while
  nothing has been applied, and raises the actionable message. `SET NOT NULL` stays inside
  the transaction: it is the real data gate, closing the window between the preflight and the
  `ACCESS EXCLUSIVE` lock.
*/

DO $$
DECLARE
  history_users integer;
  channel_count integer;
  channel_names text;
BEGIN
  SELECT count(*) INTO history_users FROM (
      SELECT "userId" FROM "CoinHistory"
      UNION SELECT "userId" FROM "XpHistory"
      UNION SELECT "userId" FROM "WatchStreak"
      UNION SELECT "userId" FROM "UserHero"
  ) refs;

  -- Nothing references a channel, so nothing can be filed under the wrong one.
  IF history_users = 0 THEN
    RETURN;
  END IF;

  SELECT count(*), string_agg("login", ', ' ORDER BY "login") INTO channel_count, channel_names
  FROM "Channel";

  IF channel_count <> 1 THEN
    RAISE EXCEPTION
      'channel_user_history: % user(s) have history rows and there are % Channel row(s) (%), and this migration will not guess which channel a viewer''s history belongs to. Fix the Channel rows, then run `prisma migrate resolve --rolled-back 20261013182939_channel_user_history` - Prisma refuses to re-run a failed migration (P3009) until that is issued - and run this migration again.',
      history_users,
      channel_count,
      coalesce(channel_names, 'none');
  END IF;
END $$;

BEGIN;

-- DropForeignKey
-- The four history tables stop pointing at `User`, so their old FKs go first; the
-- columns themselves are dropped in the last section of this file.
ALTER TABLE "CoinHistory" DROP CONSTRAINT "CoinHistory_userId_fkey";
ALTER TABLE "XpHistory" DROP CONSTRAINT "XpHistory_userId_fkey";
ALTER TABLE "WatchStreak" DROP CONSTRAINT "WatchStreak_userId_fkey";
ALTER TABLE "UserHero" DROP CONSTRAINT "UserHero_userId_fkey";

-- DropIndex
-- Named explicitly even though `DROP COLUMN "userId"` below would take these with it:
-- saying so is what a reviewer needs to check against the schema, and the UNIQUE ones
-- are constraints rather than plain indexes.
DROP INDEX "CoinHistory_userId_createdAt_idx";
DROP INDEX "XpHistory_userId_createdAt_idx";
DROP INDEX "WatchStreak_userId_streakValue_key";
DROP INDEX "UserHero_userId_key";

-- AlterTable
-- Nullable for now, so the backfill below can write to them; made NOT NULL only after
-- it has filled every row.
ALTER TABLE "CoinHistory" ADD COLUMN "channelId" TEXT,
ADD COLUMN "channelUserId" INTEGER;
ALTER TABLE "XpHistory" ADD COLUMN "channelId" TEXT,
ADD COLUMN "channelUserId" INTEGER;
ALTER TABLE "WatchStreak" ADD COLUMN "channelId" TEXT,
ADD COLUMN "channelUserId" INTEGER;
ALTER TABLE "UserHero" ADD COLUMN "channelId" TEXT,
ADD COLUMN "channelUserId" INTEGER;

-- CreateMissingTargets
-- `Viewer` upsert by `twitchId`, as `backfill:channels` does: create when absent, refresh
-- `username` when present, because a stale nickname is safer than a frozen one.
--
-- `id` is derived from `twitchId` rather than left to a random generator because `Viewer.id`
-- has no database default - Prisma's `cuid()` is client-side - so this INSERT has to supply
-- one. `substr(md5(twitchId), 1, 25)` is deterministic, so the statement is idempotent and
-- two `User`s can never fight over the same id, and 25 lowercase hex characters match the
-- length of every cuid already in the column. The column is opaque and referenced by
-- nothing but its own foreign keys.
INSERT INTO "Viewer" ("id", "twitchId", "username", "createdAt", "updatedAt")
SELECT substr(md5(u."twitchId"), 1, 25), u."twitchId", u."username", now(), now()
FROM "User" u
WHERE u."id" IN (
    SELECT "userId" FROM "CoinHistory"
    UNION SELECT "userId" FROM "XpHistory"
    UNION SELECT "userId" FROM "WatchStreak"
    UNION SELECT "userId" FROM "UserHero"
)
ON CONFLICT ("twitchId") DO UPDATE SET "username" = EXCLUDED."username";

-- CreateMissingTargets
-- `ChannelUser`, insert-only on `(channelId, viewerId)` - `ON CONFLICT DO NOTHING`, which is
-- `selectMissingRows` in SQL. An existing row is never handed to an update, so the `User` the
-- old bot is still writing cannot roll a live balance backwards.
--
-- `id` is left to the SERIAL default; `lastXpAt` and `username`'s sibling timestamps are the
-- only values that come straight across. The three lottery columns are `COALESCE`d to
-- `NO_LOTTERY` (`0`, `false`, `false`), matching `buildChannelUserRows` for a `User` with no
-- `UserLottery` row - the LEFT JOIN, not the COALESCE, is what makes the row optional.
--
-- The channel is resolved by a scalar subquery that yields NULL unless there is exactly one
-- `Channel`, so a second row inserted between the preflight above and this statement cannot
-- fan every viewer into two channels - it aborts on the NOT NULL instead.
INSERT INTO "ChannelUser" (
    "channelId",
    "viewerId",
    "coins",
    "lvl",
    "xp",
    "lastXpAt",
    "isMod",
    "isFounder",
    "isSubscriber",
    "isPermanentVip",
    "spinsCount",
    "totalWin",
    "totalLoss",
    "xpThisWeek",
    "hasTicket",
    "isLuckyVip"
)
SELECT
    (SELECT CASE WHEN count(*) = 1 THEN min("id") ELSE NULL END FROM "Channel"),
    v."id",
    u."coins",
    u."lvl",
    u."xp",
    u."lastXpAt",
    u."isMod",
    u."isFounder",
    u."isSubscriber",
    u."isPermanentVip",
    u."spinsCount",
    u."totalWin",
    u."totalLoss",
    COALESCE(l."xpThisWeek", 0),
    COALESCE(l."hasTicket", false),
    COALESCE(l."isLuckyVip", false)
FROM "User" u
JOIN "Viewer" v ON v."twitchId" = u."twitchId"
LEFT JOIN "UserLottery" l ON l."userId" = u."id"
WHERE u."id" IN (
    SELECT "userId" FROM "CoinHistory"
    UNION SELECT "userId" FROM "XpHistory"
    UNION SELECT "userId" FROM "WatchStreak"
    UNION SELECT "userId" FROM "UserHero"
)
ON CONFLICT ("channelId", "viewerId") DO NOTHING;

-- Backfill
-- Through `twitchId`, never through the ids: `User.id` and `ChannelUser.id` are two
-- unrelated integer sequences, so no amount of arithmetic relates them. `twitchId` is
-- the only key both tables share, and it is UNIQUE on both, so the join is 1:1.
UPDATE "CoinHistory" h SET "channelId" = c."id", "channelUserId" = cu."id" FROM "ChannelUser" cu JOIN "Viewer" v ON v."id" = cu."viewerId" JOIN "Channel" c ON c."id" = cu."channelId" JOIN "User" u ON u."twitchId" = v."twitchId" WHERE h."userId" = u."id";
UPDATE "XpHistory" h SET "channelId" = c."id", "channelUserId" = cu."id" FROM "ChannelUser" cu JOIN "Viewer" v ON v."id" = cu."viewerId" JOIN "Channel" c ON c."id" = cu."channelId" JOIN "User" u ON u."twitchId" = v."twitchId" WHERE h."userId" = u."id";
UPDATE "WatchStreak" h SET "channelId" = c."id", "channelUserId" = cu."id" FROM "ChannelUser" cu JOIN "Viewer" v ON v."id" = cu."viewerId" JOIN "Channel" c ON c."id" = cu."channelId" JOIN "User" u ON u."twitchId" = v."twitchId" WHERE h."userId" = u."id";
UPDATE "UserHero" h SET "channelId" = c."id", "channelUserId" = cu."id" FROM "ChannelUser" cu JOIN "Viewer" v ON v."id" = cu."viewerId" JOIN "Channel" c ON c."id" = cu."channelId" JOIN "User" u ON u."twitchId" = v."twitchId" WHERE h."userId" = u."id";

-- CreateIndex
-- `channelId` leads the composite indexes so that "this channel, this viewer" and "this
-- channel, newest first" are single index seeks without joining `ChannelUser`.
CREATE INDEX "CoinHistory_channelId_channelUserId_idx" ON "CoinHistory"("channelId", "channelUserId");
CREATE INDEX "CoinHistory_channelId_createdAt_idx" ON "CoinHistory"("channelId", "createdAt");
CREATE INDEX "XpHistory_channelId_channelUserId_idx" ON "XpHistory"("channelId", "channelUserId");
CREATE INDEX "XpHistory_channelId_createdAt_idx" ON "XpHistory"("channelId", "createdAt");
CREATE INDEX "WatchStreak_channelId_channelUserId_idx" ON "WatchStreak"("channelId", "channelUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserHero_channelUserId_key" ON "UserHero"("channelUserId");
CREATE UNIQUE INDEX "WatchStreak_channelUserId_streakValue_key" ON "WatchStreak"("channelUserId", "streakValue");

-- AlterTable
-- The data gate: if the backfill left a NULL anywhere, this fails and the whole migration
-- rolls back, with the old container still serving chat and no row lost.
ALTER TABLE "CoinHistory" ALTER COLUMN "channelId" SET NOT NULL,
ALTER COLUMN "channelUserId" SET NOT NULL;
ALTER TABLE "XpHistory" ALTER COLUMN "channelId" SET NOT NULL,
ALTER COLUMN "channelUserId" SET NOT NULL;
ALTER TABLE "WatchStreak" ALTER COLUMN "channelId" SET NOT NULL,
ALTER COLUMN "channelUserId" SET NOT NULL;
ALTER TABLE "UserHero" ALTER COLUMN "channelId" SET NOT NULL,
ALTER COLUMN "channelUserId" SET NOT NULL;

-- AddForeignKey
-- Prisma's Postgres connector always emits foreign keys as standalone `ALTER TABLE`
-- statements and never inline `REFERENCES` inside `CREATE TABLE`; these four keep the
-- database in step with the schema, so the next `prisma migrate dev` sees no drift.
ALTER TABLE "CoinHistory" ADD CONSTRAINT "CoinHistory_channelUserId_fkey" FOREIGN KEY ("channelUserId") REFERENCES "ChannelUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpHistory" ADD CONSTRAINT "XpHistory_channelUserId_fkey" FOREIGN KEY ("channelUserId") REFERENCES "ChannelUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchStreak" ADD CONSTRAINT "WatchStreak_channelUserId_fkey" FOREIGN KEY ("channelUserId") REFERENCES "ChannelUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserHero" ADD CONSTRAINT "UserHero_channelUserId_fkey" FOREIGN KEY ("channelUserId") REFERENCES "ChannelUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Last, so every statement above could still read `userId`.
ALTER TABLE "CoinHistory" DROP COLUMN "userId";
ALTER TABLE "XpHistory" DROP COLUMN "userId";
ALTER TABLE "WatchStreak" DROP COLUMN "userId";
ALTER TABLE "UserHero" DROP COLUMN "userId";

COMMIT;