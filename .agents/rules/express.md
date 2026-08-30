---
name: express
description: Express 5 conventions - automatic async error forwarding, the single terminal error middleware, the config boundary, and the trust model of the internal event route.
paths:
  - "apps/api/src/app.ts"
  - "apps/api/src/server.ts"
  - "apps/api/src/shared/middleware/**"
  - "packages/backend-shared/src/error-handler.ts"
  - "apps/bot-runtime/src/app.ts"
  - "apps/bot-runtime/src/server.ts"
  - "apps/bot-runtime/src/shared/middleware/**"
  - "apps/bot-runtime/src/prod.ts"
  - "packages/backend-shared/src/config.ts"
  - "packages/backend-shared/src/errors.ts"
---

# Express 5

## Async errors forward themselves

Express 5's router catches a rejected promise returned by a handler and calls `next(err)`
for you. Write handlers that simply throw:

```ts
app.get("/api/thing/:id", async (req, res) => {
  const thing = await getThing(req.params.id);
  if (!thing) throw new NotFoundError("Thing not found");
  res.json(thing);
});
```

Do **not** write any of these - they are Express 4 habits that add nothing here:

- an `asyncHandler` / `catchAsync` wrapper
- `try { ... } catch (e) { next(e) }` wrapped around a whole handler body
- the `express-async-errors` package

A `try/catch` is still correct when you are *translating* an error - see the `P2002`
mapping in the prisma rule - but not when you are merely forwarding one.

## One terminal error middleware

`errorHandler` (`packages/backend-shared/src/error-handler.ts`, shared by both backends) is mounted last,
after every route. It answers an `AppError` with its `statusCode`, attaches `errors` for a
`ValidationError`, and turns anything else into a 500 - the real message in development,
`"Internal server error"` in production.

Keep it last. Anything registered after it never runs on the error path.

Throw `AppError` subclasses from `@fox-sphere/backend-shared` (`errors.ts`) instead of
choosing status codes deep inside a service.

## Config is the only place that reads env

`packages/backend-shared/src/config.ts` exports a frozen `config` built through `getEnv`,
which **throws on a missing variable**. Read everything through it:

```ts
import { config } from "@fox-sphere/backend-shared";

config.port;
config.databaseUrl;
config.twitch.clientId;
```

New code reads `config`, never `process.env` directly. Three places still read it raw and
are drift, not precedent - `packages/backend-shared/src/prisma.ts` and
`packages/backend-shared/src/logger.ts` check `DEBUG`, `packages/backend-shared/src/logger.ts`
checks `NODE_ENV`, and `apps/api/src/port.ts` reads `API_PORT` (which is in no `.env.example`;
it defaults to 3001). `config` already exposes both
as `config.debug` and `config.nodeEnv`, so those are straightforwardly convertible
whenever someone is in the file.

Adding a required key to `config` means every entrypoint - and every future test - must
supply it, so give a default unless the value genuinely must come from the environment.

## The internal event route

`POST /api/internal/events` in `apps/bot-runtime/src/app.ts` accepts `{ event, data }`
and re-emits it to **every** connected socket. It has no authentication. It exists so the
dev-mode worker process can reach the server over HTTP.

- It must not be reachable from outside the deployment. `.docker/Caddyfile` answers `/api/internal/*` with a 404 before the `/api/*` proxy rule - that block stays first inside `route { }`, which is what preserves the order.
- Do not add a second route under `/api/internal/*` without writing down its trust model.
- Do not call it from the frontend. The overlay consumes socket events; it does not publish them.

## CORS is currently inconsistent

`app.use(cors())` is fully open while the Socket.io server pins `config.allowedOrigin`.
That is a known gap, not a pattern to copy. New HTTP surface should take an allowlist from
config.

## App and server are separate on purpose

`apps/bot-runtime/src/app.ts` builds and exports `app`, `httpServer` and `io` without
listening. `apps/bot-runtime/src/server.ts` listens. `apps/bot-runtime/src/prod.ts` imports
`httpServer` from the `./app` and then boots the worker in the same process. The admin
backend `apps/api` follows the same split (`app.ts`/`server.ts`). Keep `listen`
out of `app.ts` - that separation is what lets `bot-runtime`'s worker import shared code
without starting an HTTP server.
