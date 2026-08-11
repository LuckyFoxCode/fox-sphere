---
name: express
description: Express 5 conventions - automatic async error forwarding, the single terminal error middleware, the config boundary, and the trust model of the internal event route.
paths:
  - "apps/backend/src/app.ts"
  - "apps/backend/src/server.ts"
  - "apps/backend/src/prod.ts"
  - "apps/backend/src/shared/middleware/**"
  - "apps/backend/src/shared/errors/**"
  - "apps/backend/src/shared/config/**"
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

`errorHandler` (`apps/backend/src/shared/middleware/error-handler.ts`) is mounted last,
after every route. It answers an `AppError` with its `statusCode`, attaches `errors` for a
`ValidationError`, and turns anything else into a 500 - the real message in development,
`"Internal server error"` in production.

Keep it last. Anything registered after it never runs on the error path.

Throw `AppError` subclasses from `shared/errors` instead of choosing status codes deep
inside a service.

## Config is the only place that reads env

`apps/backend/src/shared/config/index.ts` exports a frozen `config` built through
`getEnv`, which **throws on a missing variable**. Read everything through it:

```ts
import { config } from "../shared/config";

config.port;
config.databaseUrl;
config.twitch.clientId;
```

Never touch `process.env` outside `shared/config`. Adding a required key there means every
entrypoint - and every future test - must supply it, so give a default unless the value
genuinely must come from the environment.

## The internal event route

`POST /api/internal/events` accepts `{ event, data }` and re-emits it to **every**
connected socket. It has no authentication. It exists so the dev-mode worker process can
reach the server over HTTP.

- It must not be reachable from outside the deployment. Caddy fronts only what it is configured to front - keep it that way.
- Do not add a second route under `/api/internal/*` without writing down its trust model.
- Do not call it from the frontend. The overlay consumes socket events; it does not publish them.

## CORS is currently inconsistent

`app.use(cors())` is fully open while the Socket.io server pins `config.allowedOrigin`.
That is a known gap, not a pattern to copy. New HTTP surface should take an allowlist from
config.

## App and server are separate on purpose

`app.ts` builds and exports `app`, `httpServer` and `io` without listening. `server.ts`
listens. `prod.ts` listens and then boots the worker in the same process. Keep `listen`
out of `app.ts` - that separation is what lets the worker import `shared/` without
starting an HTTP server.
