# api

The admin-panel backend. Express 5 + Zod, with the OpenAPI spec generated from the
route declarations themselves.

**Deployed**, since this release, in its own compose project `foxsphere-admin`
(`.docker/admin.Dockerfile` → `admin-api`, started by `docker-compose.admin.yml` on the VM
beside the bot's stack, sharing its `.env` and its Postgres). It is not in the **dev** compose
file - locally it runs on its own via `pnpm dev:api` - and it publishes no host port: the only
caller is the panel's Caddy, which reaches it by service name on the shared network. The
deployed Twitch backend remains `apps/bot-runtime`, a separate app and a separate stack.

```bash
pnpm dev:api          # from the repo root - tsx watch, :3001
```

| URL | What |
|---|---|
| http://localhost:3001/api/* | the panel's routes, behind the session guard |
| http://localhost:3001/docs | Swagger UI, behind the same guard |
| http://localhost:3001/openapi.json | the generated spec, behind the same guard |
| http://localhost:3001/health | `{"status":"ok"}` |

In production none of those URLs is reachable from the host: the panel is on
`127.0.0.1:5174`, `/api/*` is proxied to this app, and `.docker/Caddyfile.admin` answers 404 for
`/docs` and `/openapi.json` before the request gets here. So in production the only copy of the
spec anyone can read is the committed one — which is also the copy orval and CI work from.

`/docs` is mounted behind `requireSession`, not above it. It used to sit above the guard on the
claim that Swagger cannot carry a session; that claim is wrong — cookies are host-scoped and
port-agnostic, so a browser holding `fx_session` sends it whatever rendered the page, and
`src/lib/session.ts` holds `login()` and `logout()` with no `fetch` wrapper that a 401 could turn
into a redirect. The trade is the usual one: an anonymous visitor gets a JSON 401 instead of the
page. In dev that costs nothing, because you are already signed in to use the panel at all.

It needs Postgres (`docker compose up -d postgres`) and a complete `.env` at the repo root -
`config` throws on the first missing variable.

## Adding an endpoint

A route is declared **once**. `createModule(tag)` returns `{ router, route }`; a `route()`
call registers the OpenAPI path *and* mounts the Express handler *and* wires up Zod
validation, all from the same object - there is no second file to keep in sync. Two things
still are on you: registering the module in `src/modules/index.ts` (step 3 below), and
running the two regeneration commands (step 4).

### 1. Write the schemas

They live in `packages/shared-schemas`, so the admin and any future app share them.
`.openapi("Name")` on a **body or response** schema makes it a named component in the spec,
which is what makes orval emit a named TypeScript type instead of an inline blob. Naming a
`params`/`query` schema is still good practice, but OpenAPI inlines those as `parameters`
either way.

```ts
// packages/shared-schemas/src/user/user.schema.ts
import "../zod-extensions.js";
import { z } from "zod";

export const UserResponseSchema = z
  .object({
    id: z.string().openapi({ example: "clx1abc123def" }),
    login: z.string().openapi({ example: "luckyfoxcode" }),
    coins: z.number().int(),
  })
  .openapi("User");

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const GetUserParamsSchema = z
  .object({
    id: z.string().openapi({ example: "clx1abc123def", param: { name: "id", in: "path" } }),
  })
  .openapi("GetUserParams");
```

Export it from the module barrel (`src/user/index.ts`) and from `src/index.ts`, then
`pnpm build:p`.

### 2. Write the service

Plain data in, plain data out. No `req`, no `res`, no status codes.

```ts
// apps/api/src/modules/user/user.service.ts
import { prisma } from "@fox-sphere/backend-shared";
import type { UserResponse } from "@fox-sphere/shared-schemas";

export const getUserById = async (id: string): Promise<UserResponse | null> =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, login: true, coins: true },
  });
```

### 3. Declare the route

```ts
// apps/api/src/modules/user/user.routes.ts
import { GetUserParamsSchema, UserResponseSchema } from "@fox-sphere/shared-schemas";
import { NotFoundError } from "@fox-sphere/backend-shared";
import { createModule } from "../../shared/openapi";
import { getUserById } from "./user.service";

const { router, route } = createModule("Users"); // tag: the spec group + orval folder

route(
  {
    method: "get",
    path: "/users/:id",          // no /api prefix here - it is added for you
    summary: "Get user by ID",
    operationId: "getUserById",  // becomes getUserById() / useGetUserById()
    request: { params: GetUserParamsSchema },
    responses: {
      200: { description: "User found", schema: UserResponseSchema },
      400: { description: "Invalid user id" },
      404: { description: "User not found" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    const user = await getUserById(req.params.id as string);
    if (!user) throw new NotFoundError("User not found");
    res.json(user);
  },
);

export { router as userRouter };
```

Barrel it (`src/modules/user/index.ts` → `export { userRouter } from "./user.routes";`) and
add one entry to `src/modules/index.ts`:

```ts
export const modules: readonly { prefix: string; router: Router }[] = [
  { prefix: "/api", router: channelRouter },
  { prefix: "/api", router: userRouter },
];
```

That single list is what `app.ts` mounts and what `dump-openapi.ts` loads, so a module
cannot be live in the app while missing from the spec.

### 4. Regenerate

```bash
pnpm openapi:dump    # apps/api/openapi.json   (committed)
pnpm gen:api         # apps/admin/src/api/generated/  (committed)
```

Both in the same commit as the route. CI fails the PR if either is stale.

## The other verbs

Everything is the same shape; only `request` changes. Whatever you put in `request` is both
validated at runtime and documented in the spec - never add a `validate(...)` call yourself,
`route()` already mounted one.

```ts
// POST - a body
route(
  {
    method: "post",
    path: "/users",
    summary: "Create user",
    operationId: "createUser",
    request: { body: CreateUserSchema },
    responses: {
      201: { description: "User created", schema: UserResponseSchema },
      400: { description: "Validation failed" },
    },
  },
  async (req, res) => {
    res.status(201).json(await createUser(req.body));
  },
);

// PATCH - params and a body
route(
  {
    method: "patch",
    path: "/users/:id",
    summary: "Update user",
    operationId: "updateUser",
    request: { params: GetUserParamsSchema, body: UpdateUserSchema },
    responses: {
      200: { description: "User updated", schema: UserResponseSchema },
      404: { description: "User not found" },
    },
  },
  handler,
);

// DELETE - no response body
route(
  {
    method: "delete",
    path: "/users/:id",
    summary: "Delete user",
    operationId: "deleteUser",
    request: { params: GetUserParamsSchema },
    responses: {
      204: { description: "User deleted" },
      404: { description: "User not found" },
    },
  },
  async (req, res) => {
    await deleteUser(req.params.id as string);
    res.status(204).end();
  },
);

// GET - a query string
route(
  {
    method: "get",
    path: "/users",
    summary: "List users",
    operationId: "listUsers",
    request: { query: ListUsersQuerySchema },
    responses: { 200: { description: "Users", schema: UserListSchema } },
  },
  handler,
);
```

`params` and `query` must be a `ZodObject`; `body` can be any Zod schema.

The **parsed** value is what reaches your handler, so coercions and `.default()`s apply and
unknown keys are stripped. `req.params` and `req.body` are replaced in place; `req.query` is
read-only in Express 5, so the parsed query is on `req.validatedQuery`.

## Errors

Throw, don't build error JSON. Express 5 forwards a rejected promise to the error
middleware on its own - no `try/catch`, no `asyncHandler`.

```ts
import { NotFoundError, ValidationError, AppError } from "@fox-sphere/backend-shared";

throw new NotFoundError("Channel not found");   // -> 404 {status, message}
```

`errorHandler` (in `@fox-sphere/backend-shared`, shared with `bot-runtime`) answers any `AppError` with its status code, attaches
`errors` for a `ValidationError`, and turns anything else into a 500 (the real message in
development, `"Internal server error"` in production). A schema mismatch in `request`
becomes a `ValidationError` before your handler runs.

Document each status you actually return - the 4xx and the 500. Any status >= 400 with no
`schema` of its own is documented with `ErrorResponseSchema` (the exact body above)
automatically. The generated client turns every documented status into its own union
member, so an *undocumented* status reaches the admin as a shape its types call impossible,
and the UI has no branch for it.

## Layout

```
src/
  app.ts                    express app, module mounts, 404 - no listen()
  server.ts                 listen() on :3001
  port.ts                   API_PORT, default 3001
  dump-openapi.ts           writes openapi.json
  modules/
    index.ts                the one list app.ts mounts and dump-openapi.ts loads
    <feature>/              <feature>.routes.ts | .service.ts | index.ts
  shared/
    openapi/
      define-route.ts       createModule + route()  <- the abstraction above
      registry.ts           the single OpenAPIRegistry
      generator.ts          registry -> OpenAPI document
    middleware/
      validate.ts           Zod -> ValidationError (errorHandler is shared,
                            in @fox-sphere/backend-shared)
```

Conventions: double quotes, two-space indent, semicolons, `const` arrow functions, no
`any`, relative imports with **no** file extensions and no path alias, and every module
folder carries a barrel. Import from the barrel, not a deep path.

## Gotchas

- **`pnpm start` is broken here**, same as in `bot-runtime`: `node dist/server.js` cannot resolve extensionless ESM specifiers. Use `pnpm dev:api`.
- **`openapi.json` is committed and generated.** Never hand-edit it; re-run `pnpm openapi:dump`.
- **Never call `registry.registerPath` or `router.get/post/...` directly.** That is how the spec and the routes drift apart - the whole reason `route()` exists. A duplicate method+path throws at import for the same reason.
- **`app.use(cors())` is wide open.** Known gap, not a pattern to copy - new HTTP surface should take an allowlist from config.
- **No Socket.io here.** The realtime surface and the worker's `/api/internal/events` bridge live in `apps/bot-runtime`; this app is HTTP only.
- **Unmatched routes get a JSON 404**, not Express's HTML page - the generated client `JSON.parse`s every body.

The agent-facing version of these rules, with the reasoning, is
[`.agents/rules/openapi-routes.md`](../../.agents/rules/openapi-routes.md). The client side
is [`apps/admin/README.md`](../admin/README.md).
