---
name: typescript
description: TypeScript conventions across both apps and both packages - import style, strictness, and the places the two tsconfigs disagree.
paths:
  - "**/*.ts"
  - "**/*.vue"
---

# TypeScript

## Everywhere

- `const` arrow functions, not `function` declarations.
- Never `any`. Use `unknown` and narrow. The backend eslint has `@typescript-eslint/no-explicit-any` at `warn` - treat it as an error regardless.
- Prefer `const`; never `var`.
- Unused parameters are prefixed `_` - backend eslint sets `argsIgnorePattern: "^_"`.
- `??` for defaults rather than `||`, unless falsy-coalescing is what you actually want.
- Every module folder exports through a barrel `index.ts`; import from the barrel, not a deep path.

## Backend imports

`apps/backend/tsconfig.json` sets `moduleResolution: "Bundler"`, and the backend has **no
path alias**.

```ts
// right
import { config } from "../shared/config";
import { PrismaClient } from "../../generated/prisma/client";

// wrong - no alias is configured for the backend
import { config } from "@/shared/config";

// wrong - this codebase does not use extensions
import { config } from "../shared/config/index.js";
```

Adding `.js` extensions to some files and not others produces a tree neither resolution
mode handles cleanly. If extensions are ever introduced it is a whole-app migration, never
a per-file choice.

`target` is ES2022 and `strict` is on.

## Frontend imports

`apps/frontend/tsconfig.app.json` maps `@/*` to `./src/*`. Use it - long relative chains
are not the house style there.

It also sets **`noUncheckedIndexedAccess: true`**, so any indexed read is `T | undefined`:

```ts
const first = items[0]; // Item | undefined
if (!first) return;
```

Narrow it. Do not reach for `!` unless the index is provably in range on the line above.

## Packages

`packages/types` and `packages/shared-schemas` build with tsdown, not `tsc`, and are
consumed as `workspace:*`. A change to either must be rebuilt with `pnpm build:p` before
an app type-checks against it.
