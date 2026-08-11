---
name: prisma
description: Prisma 7 conventions for fox-sphere - the single client, generate-before-typecheck, migration commands, query shape, and mapping ORM errors at the data boundary.
paths:
  - "apps/backend/prisma/**"
  - "apps/backend/prisma.config.ts"
  - "apps/backend/src/**/*.ts"
---

# Prisma 7

## One client, one pool

`apps/backend/src/shared/lib/prisma.ts` builds the only `PrismaClient` in the process: a
`pg.Pool`, wrapped in `PrismaPg`, passed as `adapter`. Import that instance.

```ts
import { prisma } from "../../shared/lib";
```

Import from the `shared/lib` barrel, not a deep path. There are 12 call sites in
`apps/backend/src`: the ten outside `shared/` import it as `../../shared/lib` (or deeper);
the two files that live inside `shared/` itself reach the sibling `lib/` directory
directly, since they're already at that level — `shared/services/stream-state.service.ts`
does this correctly via the barrel (`../lib`), but `shared/infra/lifecycle.ts` imports the
deep `../lib/prisma` path and violates this rule. The barrel rule in the typescript rule
still applies: import the barrel, not `lib/prisma`, even from inside `shared/`.

Never call `new PrismaClient()` anywhere else. Each one opens its own connection pool, and
Postgres runs out of connections well before anyone connects the symptom to the cause.

Types come from the generated client, and the entrypoint ends in `/client`:

```ts
import { PrismaClient } from "../../generated/prisma/client";
```

## Generate before you type-check

`/src/generated/prisma` is gitignored. After a clone, and after **every** schema edit:

```bash
pnpm prisma:g
```

`tsc` fails with missing-module errors until it has run. The Docker build does this for
you; a host build does not.

## The datasource has no url, and that is correct

```prisma
datasource db {
  provider = "postgresql"
}
```

Prisma 7 takes the URL from `apps/backend/prisma.config.ts`, which reads
`env("DATABASE_URL")`. If a command complains about a missing URL, fix the environment -
do not add `url` back to the schema.

## Migrations

| Command | When |
|---|---|
| `pnpm prisma:m` (`prisma migrate dev`) | local - generates and applies |
| `pnpm --filter backend migrate:deploy` | production - applies only, generates no artifacts |
| `pnpm prisma:s` | Prisma Studio |

Never edit a migration that has been applied anywhere. Add a new one.

## Query shape

- Prefer `select` over `include` on anything in a chat-message or socket-event path. `include` fetches whole related rows you then discard.
- Group related writes in `prisma.$transaction([...])` so a partial economy update cannot survive a crash.
- Every foreign key in the current schema already carries `@@index`. Add an index when you introduce a new query predicate, not speculatively.

## ORM errors stop at the data boundary

Translate Prisma error codes into `AppError` subclasses where the query is made, so no
route handler ever sees a `PrismaClientKnownRequestError`:

```ts
import { ConflictError } from "../../shared/errors";

try {
  return await prisma.user.create({ data });
} catch (e) {
  if (e instanceof Error && "code" in e && e.code === "P2002") {
    throw new ConflictError("User already exists");
  }
  throw e;
}
```

`AppError`, `NotFoundError`, `ConflictError` and `ValidationError` live in
`apps/backend/src/shared/errors/app-error.ts`. The error middleware turns them into
responses; nothing deeper in the stack should be choosing a status code.

## Traps in the current schema

- **`TwitchToken.obtainmentTimestamp` is `BigInt`.** `JSON.stringify` throws on a BigInt, so a raw `TwitchToken` cannot go through `res.json()` or `io.emit()`. Convert with `Number()` or `.toString()` at the boundary.
- **`TwitchToken` has no `@id`.** Its unique criterion is `twitchUserId` - that is what `findUnique` and `upsert` key on.
- **`SystemState` is a singleton row** (`@id @default(1)`). Upsert it; never create a second.

## Never edit generated output

`apps/backend/src/generated/` is rewritten by every `prisma generate`. Edits there vanish
without a trace.
