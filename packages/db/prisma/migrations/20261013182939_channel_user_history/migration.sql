/*
  Release B, step "tenant schema": repoint the four history tables from `User` to
  `ChannelUser`, so a balance's history is scoped by channel the way the balance itself
  now is (see `apps/bot-runtime/docs/multi-tenant-architecture.md`, phase 1 steps 2, 6
  and 14). The bot keeps writing to these four tables; only the key changes.

  `User` and `UserLottery` are deliberately left alone. They stay in the schema, frozen,
  and are dropped in their own migration at the end of phase 1 - so a rollback to the
  previous bot image still finds a readable `User`.

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

  WHY A ROW WITH NO MATCHING `ChannelUser` ABORTS THE DEPLOY

  The `UPDATE`s use an inner join, so a history row whose viewer has no `ChannelUser` row
  is left NULL, and the `SET NOT NULL` below then fails the whole migration. That is the
  intended outcome: the deploy stops with the old container still serving chat, and the
  operator fixes it instead of losing ledger rows. `CoinHistory` is money - a migration
  that quietly dropped unmoved rows would be worse than one that refuses.

  The precondition is the manual `backfill:channels --sync` that phase 1 step 14 puts
  before the cutover; without it, any `User` that appeared since the last deploy aborts
  this migration.

  WHY THE PREFLIGHT IS OUTSIDE THE TRANSACTION

  Inside one, its message would be thrown away. Postgres keeps only the first error of a
  transaction: once the `SET NOT NULL` fails, every later command - including `COMMIT` -
  answers "current transaction is aborted, commands ignored until end of transaction
  block", and that is the text the operator ends up reading. The preflight therefore runs
  first, while nothing has been applied, and raises the actionable message naming the
  twitchIds at fault. The `SET NOT NULL` stays where it is: it is the real gate, because
  it closes the window between the preflight and the `ACCESS EXCLUSIVE` lock.
*/

DO $$
DECLARE
  unmatched text;
BEGIN
  SELECT string_agg(DISTINCT u."twitchId", ', ') INTO unmatched
  FROM (
      SELECT "userId" FROM "CoinHistory"
      UNION SELECT "userId" FROM "XpHistory"
      UNION SELECT "userId" FROM "WatchStreak"
      UNION SELECT "userId" FROM "UserHero"
  ) refs
  JOIN "User" u ON u."id" = refs."userId"
  WHERE NOT EXISTS (
      SELECT 1 FROM "ChannelUser" cu
      JOIN "Viewer" v ON v."id" = cu."viewerId"
      WHERE v."twitchId" = u."twitchId"
  );
  IF unmatched IS NOT NULL THEN
    RAISE EXCEPTION
      'channel_user_history: history rows reference twitchId(s) % which have no ChannelUser row, so they cannot be moved. Run `pnpm --filter bot-runtime backfill:channels --sync <channel login>` first, then re-run this migration.',
      unmatched;
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
-- The gate described in the header: if the backfill left a NULL anywhere, this fails
-- and the whole migration rolls back with the old container still serving chat.
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