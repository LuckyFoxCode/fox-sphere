---
name: prisma
description: Prisma 7 conventions specific to fox-sphere - the single client, generate-before-typecheck, the schema's traps, and mapping ORM errors at the data boundary.
paths:
  - "packages/db/prisma/**"
  - "packages/db/prisma.config.ts"
  - "apps/bot-runtime/src/**/*.ts"
  - "apps/api/src/modules/**/*.ts"
  - "packages/backend-shared/src/**/*.ts"
---

# Prisma 7

General Prisma usage - CLI commands, client query shape, `select`/`include`, transactions,
and the v6-to-v7 upgrade path - lives in the `prisma-client-api`, `prisma-cli` and
`prisma-upgrade-v7` skills. This rule covers only what is specific to fox-sphere.

## One client, one pool

`packages/backend-shared/src/prisma.ts` builds the only `PrismaClient` in the process: a
`pg.Pool`, wrapped in `PrismaPg`, passed as `adapter`. Both `apps/api` and
`apps/bot-runtime` consume it. Import that instance from the package barrel:

```ts
import { prisma } from "@fox-sphere/backend-shared";
```

Never call `new PrismaClient()` anywhere else. Each one opens its own connection pool, and
Postgres runs out of connections well before anyone connects the symptom to the cause.

Types come from the generated client. Import `PrismaClient` and model types from
`@fox-sphere/db`:

```ts
import { PrismaClient } from "@fox-sphere/db";
import type { ChannelUser } from "@fox-sphere/db";
```

`ChannelUser` and `Viewer` are what live code types against. `User` and `UserLottery` still
generate cleanly, which is exactly the problem — see the frozen-tables section below.

## Generate before you type-check

`packages/db/src/generated/` is gitignored. After a clone, and after **every** schema edit:

```bash
pnpm prisma:g
```

`tsc` fails with missing-module errors until it has run. The Docker build does this for
you; a host build does not.

`pnpm prisma:m` (`prisma migrate dev`) is the local command - it generates and applies.
`pnpm --filter @fox-sphere/db prisma:migrate:deploy` (`prisma migrate deploy`) is the
production one - it applies only and generates no artifacts, and is invoked by the deploy
workflow rather than run by hand. Never edit a migration that has already been applied
anywhere; add a new one. For the rest of the CLI verbs, see the `prisma-cli` skill.

## The datasource has no url, and that is correct

```prisma
datasource db {
  provider = "postgresql"
}
```

Prisma 7 takes the URL from `packages/db/prisma.config.ts`, which reads
`env("DATABASE_URL")`. If a command complains about a missing URL, fix the environment -
do not add `url` back to the schema.

## ORM errors stop at the data boundary

Translate Prisma error codes into `AppError` subclasses where the query is made, so no
route handler ever sees a `PrismaClientKnownRequestError`:

```ts
import { ConflictError } from "@fox-sphere/backend-shared";

try {
  return await prisma.channelUser.create({ data });
} catch (e) {
  if (e instanceof Error && "code" in e && e.code === "P2002") {
    throw new ConflictError("ChannelUser already exists");
  }
  throw e;
}
```

`AppError`, `NotFoundError`, `ConflictError` and `ValidationError` live in
`packages/backend-shared/src/errors.ts`. The error middleware turns them into
responses; nothing deeper in the stack should be choosing a status code.

## The bot's `channelId` comes from `resolveChannelContext()`, never from a second lookup

`apps/bot-runtime/src/modules/channel/channel-context.ts` resolves the `Channel` row that
`TWITCH_CHANNEL_NAME` names with a single `findUnique`, caches `{ channelId, login }` in the
module, and `bootstrap()` awaits it before any Twitch session is opened. Take `channelId`
from there:

```ts
import { resolveChannelContext } from "../../channel";

const { channelId } = await resolveChannelContext();
```

Three things follow, and they are the reason it is one function rather than an inline query
at each of the call sites:

- **Nothing invalidates the cache.** A `Channel` row edited mid-process is not seen until the
  next restart. That is deliberate - the row is configuration and there is one channel - so
  code that needs a fresher answer has to restart, not re-query.
- **A missing row throws, it does not return `null`.** `bootstrap()` calls the resolver as its
  first step precisely so a deployment with no `Channel` row fails there, with a message naming
  `TWITCH_CHANNEL_NAME` and the script that creates the row, instead of from whichever query
  happens to run first.
- **Cache keys are `channelId`-scoped, not `twitchId`-scoped.** A key of `${channelId}:${twitchId}`
  is correct whether or not there is one channel, and a bare `twitchId` key is correct only
  while `TWITCH_CHANNEL_NAME` is the single source of truth — which is exactly the assumption
  the cutover removes. `UserCache` and `CommandRegistry`'s `userCooldowns` both build the
  scoped key, in one place each. Write the scoped key now.

**The resolver is for choosing a channel, not for stamping a row.** It answers "which channel is
this process serving", which is what `ensureChannelUser` needs to create a balance. It is not
what a *history* write needs — that needs the channel the balance belongs to, and that answer
is already on the row. Two lookups for one write is two chances to disagree.

## Traps in the current schema

- **`TwitchToken.obtainmentTimestamp` is `BigInt`.** `JSON.stringify` throws on a BigInt, so a raw `TwitchToken` cannot go through `res.json()` or `io.emit()`. Convert with `Number()` or `.toString()` at the boundary.
- **`TwitchToken` has no `@id`.** Its unique criterion is `twitchUserId` - that is what `findUnique` and `upsert` key on.
- **`SystemState` is a singleton row** (`@id @default(1)`). Upsert it; never create a second.
- **Every relation field in the current schema already has a matching `@@index`.** Add an
  index when you introduce a new query predicate, not speculatively.
- **A history row belongs to a `(channelId, channelUserId)` pair, and `channelId` there is a
  plain column with no foreign key.** `CoinHistory`, `XpHistory`, `WatchStreak` and
  `UserHero` carry both since `20261013182939_channel_user_history`; only `channelUserId` is
  the relation, and it is the cascade target. Nothing in the database stops `channelId` from
  drifting away from `ChannelUser.channelId`, so write both from the same channel context —
  in practice, **read both off the `ChannelUser` row you already hold**, not from
  `resolveChannelContext()`:

  ```ts
  const channelUser = await requireChannelUser(twitchId);
  await prisma.coinHistory.create({
    data: {
      channelId: channelUser.channelId,
      channelUserId: channelUser.id,
      // ...
    },
  });
  ```

  Two of the three ways that pair used to go wrong are now behind us, and both are worth
  remembering as reasons for the shape. `User.id` and `ChannelUser.id` are unrelated
  autoincrement sequences, so handing a history write the wrong number satisfies the column
  and files the row under a different viewer entirely. And a `UserLottery` row with no `where`
  clause on the reset cleared every channel's week, because the table had no channel to filter
  by in the first place.

- **`User` and `UserLottery` are frozen.** No bot code reads or writes them after that same
  migration, so a `ChannelUser` balance and a `User` balance legitimately differ, and `User`
  is the wrong one. Do not "fix" a divergence by writing `User`, and do not add columns to
  `User` — both are dropped in their own migration at the end of phase 1. The only code that
  still reads them is `scripts/backfill-channels.ts` (insert-only on every deploy, destructive
  behind `--sync`) and the migration that drops them.

## `User` and `UserLottery` are frozen — and no bot code touches them

This is the one row in the schema with no remaining writer, and the trap is that it looks
perfectly usable. `User` still has `coins`, `xp`, `lvl`, `spinsCount`, `isPermanentVip`, and
`UserLottery` still has `xpThisWeek`, `hasTicket`, `isLuckyVip`, and Prisma will happily
generate a `prisma.user.findUnique` for you.

Every one of those columns was copied onto `ChannelUser` — including the three lottery ones,
so the lottery needs no join at all — and since the Release B cutover the bot's only writer is
`ChannelUser`. `User` is a stale snapshot that diverges from the live balance by the minute.

```bash
# the check to run before you believe it
grep -rn "prisma\.user\b\|prisma\.userLottery" apps/bot-runtime/src --include="*.ts"
```

Non-empty is the alarm. Every legitimate hit is inside `__tests__` and is
`expect(await prisma.user.count()).toBe(0)` — the release's direction asserted as a test. A hit
outside `__tests__` is an unfinished transfer, not a curiosity.

## Never edit generated output

`packages/db/src/generated/` is rewritten by every `prisma generate`. Edits there vanish
without a trace.
