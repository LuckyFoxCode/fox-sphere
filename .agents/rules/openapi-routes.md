---
name: openapi-routes
description: How every apps/api endpoint is declared - one createModule router per feature, one route() call per endpoint, the spec and the Express handler from the same object, then the committed openapi.json the admin client is generated from.
paths:
  - "apps/api/src/modules/**"
  - "apps/api/src/shared/openapi/**"
  - "apps/api/src/dump-openapi.ts"
  - "packages/shared-schemas/**"
  - "apps/admin/orval.config.ts"
---

# OpenAPI routes (`apps/api`)

`apps/api` is Express, so there are no decorators. `createModule` is the stand-in: one call
per feature module, one `route()` per endpoint, and the OpenAPI path plus the Express
handler come out of the **same object**.

What that actually guarantees: **a `route()` call cannot register a path without also
mounting a handler, or mount one without registering the path.** Two things are still on
you - the committed `openapi.json` is only as fresh as your last `pnpm openapi:dump`, and a
new module reaches neither the app nor the spec until it is added to
`apps/api/src/modules/index.ts`. That file is the single list `app.ts` mounts and
`dump-openapi.ts` loads, so adding it there does both at once. `/health`,
`/api/internal/events` and `/openapi.json` are mounted directly on `app` and deliberately
absent from the spec.

## One module = one tag = one router

```
apps/api/src/modules/<feature>/
  <feature>.routes.ts    createModule + route() calls
  <feature>.service.ts   Prisma / business logic, no Express types
  index.ts               barrel: export { <feature>Router }
```

```ts
// apps/api/src/modules/user/user.routes.ts
import { UserResponseSchema, GetUserParamsSchema } from "@fox-sphere/shared-schemas";
import { NotFoundError } from "@fox-sphere/backend-shared";
import { createModule } from "../../shared/openapi";
import { getUserById } from "./user.service";

const { router, route } = createModule("Users");   // tag -> Swagger group + orval folder

route(
  {
    method: "get",
    path: "/users/:id",
    summary: "Get user by ID",
    operationId: "getUserById",
    request: { params: GetUserParamsSchema },
    responses: {
      200: { description: "User found", schema: UserResponseSchema },
      404: { description: "User not found" },
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

Then register it once, in `apps/api/src/modules/index.ts`:

```ts
export const modules: readonly { prefix: string; router: Router }[] = [
  { prefix: "/api", router: channelRouter },
  { prefix: "/api", router: userRouter },
];
```

`app.ts` mounts that list and `dump-openapi.ts` imports it, so one line covers both.

The `/api` prefix lives in `app.ts` and in `API_PREFIX` inside `define-route.ts`. Paths
passed to `route()` never repeat it.

## The verbs

`method` is `"get" | "post" | "put" | "patch" | "delete"` (`put` behaves exactly like the
`patch` example below). Everything else is the same shape; only what you validate changes.

```ts
// POST - body
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
    const user = await createUser(req.body);
    res.status(201).json(user);
  },
);

// PATCH - params + body
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

// DELETE - params only, no response body
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

// GET with a query string
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

Anything in `request` is validated **and** documented: `params` and `query` must be a
`ZodObject`, `body` any Zod schema. `route()` mounts the `validate` middleware for each in
the order params, query, body - do not add a `validate(...)` call by hand, that is a
duplicate.

`validate` keeps the **parsed** value, so coercions, `.default()`s and unknown-key
stripping actually reach the handler. `req.params` and `req.body` are replaced in place;
`req.query` is a getter in Express 5, so the parsed query lands on `req.validatedQuery`.

## Rules

- **Never call `registry.registerPath` directly, and never call `router.get/post/...`
  directly.** Both exist only inside `define-route.ts`. Hand-registering is how the spec
  and the routes drift apart - that is the whole class of bug this replaces. (There is no
  `*.openapi.ts` file any more; they were deleted for this reason.)
- **Always set `operationId`.** It becomes the generated client's function and hook name
  (`getChannelById` -> `useGetChannelById`). Without it orval invents a name from the path, and the
  name changes when the path does.
- **Schemas live in `packages/shared-schemas`**, named with `.openapi("Name")`. That
  promotes **body and response** schemas to `components.schemas`, which is what makes orval
  emit a named type per schema; `params`/`query` schemas are inlined as OpenAPI
  `parameters` regardless of their name.
- **Document every status you actually return**, the 4xx and 500 included. A status with no
  `schema` of its own is documented with `ErrorResponseSchema` when it is >= 400, and as a
  body-less answer otherwise (204). Skipping them is not cosmetic: the generated client
  turns each documented status into a union member, so an undocumented status reaches the
  admin as a shape its types say is impossible.
- **One `route()` per method and path.** A second registration of the same pair throws at
  import - zod-to-openapi would otherwise overwrite the first in the spec while Express
  kept serving the original handler.
- Handlers throw `AppError` subclasses; they never build error JSON. See the express rule.
- The service layer takes and returns plain data - no `req`, no `res`.

## After changing any route

```bash
pnpm openapi:dump    # rewrites apps/api/openapi.json
pnpm gen:api         # regenerates the admin client from that file
```

`apps/api/openapi.json` is **committed**. It is the input to orval, so `apps/admin` builds
and type-checks without a running server. A route change that skips the dump leaves the
admin client stale, and nothing fails loudly - so run both, in the same commit.

`GET /openapi.json` on the running server serves the same document; `/docs` is Swagger UI
over it.
