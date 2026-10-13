# syntax=docker/dockerfile:1
# Admin backend image: the panel's API, on :3001.
# Build context = repo root (needs workspace packages).
#
#   docker build -f .docker/admin.Dockerfile -t foxsphere-admin-api .
#
# This is a separate stack from the Twitch bot, with its own compose file and release
# workflow. Nothing here shares a runtime with bot-runtime; the two only meet at the
# Postgres database and at .agents/rules/monorepo.md.

# ==========================================
# Base: Node 24 LTS + pinned pnpm via corepack
# ==========================================
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
WORKDIR /app

# --- Non-root, same as the sibling images. ----------------------------------
# Nothing bind-mounts host paths into this image (it ships a real database URL from
# compose, never the dev bind-mount), so the EACCES story from bot-runtime does not
# apply. Kept anyway so all three images run as uid 1000 and a container stopped and
# inspected on the VM reads the same either way.
RUN chown -R node:node /app
USER node

# ==========================================
# Dependencies: install once, cache by manifests
# ==========================================
FROM base AS deps
# --chown so the copied manifests + resulting node_modules belong to `node`.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Exactly the four packages apps/api can reach, and not one more:
#   apps/api            -> backend-shared, shared-schemas
#   backend-shared      -> db, types
# Nothing else has an internal dependency. A missing line here is NOT a build error -
# pnpm resolves the graph it was given, and the failure surfaces later as an unresolvable
# `workspace:*` specifier deep inside the install. An extra line is worse: it installs
# a member this image never runs. See .agents/rules/monorepo.md.
COPY --chown=node:node apps/api/package.json ./apps/api/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/shared-schemas/package.json ./packages/shared-schemas/
COPY --chown=node:node packages/backend-shared/package.json ./packages/backend-shared/
COPY --chown=node:node packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# ==========================================
# Build: compile the packages + generate the Prisma client.
# ARG keeps DATABASE_URL build-only (never persisted in any image layer
# that ships) - prisma generate resolves env() but never connects, so the
# placeholder never has to be a reachable database.
# ==========================================
FROM deps AS build
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL
COPY --chown=node:node . .
RUN pnpm --filter @fox-sphere/db exec prisma generate
RUN pnpm --filter "./packages/*" build
# apps/api is deliberately NOT compiled. The runner starts `tsx src/server.ts` straight
# from TypeScript sources, exactly as bot-runtime runs `tsx src/prod.ts`, so a `dist/`
# here would be a second, unused copy of the app that can drift from the source it is
# built from - and `tsc` on this package emits ESM with extensionless relative imports,
# which Node's loader cannot resolve. That is why `start` (node dist/server.js) is
# broken and `start:prod` is the script the image runs.

# ==========================================
# Runner: minimal production image, non-root (`node`, inherited from base)
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
# The deployed app plus the packages it imports, and nothing else. `pnpm install
# --frozen-lockfile` tolerates workspace members that are absent from the context, so
# the lockfile stays authoritative with only these two directories present.
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/packages ./packages
# `--prod` is why tsx sits in apps/api's `dependencies` and not its `devDependencies`:
# this image has no build step left to run it, so a devDependency would be pruned and
# the container would die with "tsx not found" on the first boot.
RUN pnpm install --prod --frozen-lockfile
# apps/api/src/port.ts reads API_PORT and defaults to 3001. Pinning it here makes the
# EXPOSE, the HEALTHCHECK below and the Caddy upstream the same number by construction:
# set API_PORT on the container and the app would listen elsewhere while the healthcheck
# kept probing 3001, failing forever with a symptom that reads like a hung process.
ENV API_PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# `prisma migrate deploy` is NOT run here: apps/api never migrates anything, and the
# migrations belong to whichever release applies them. See deploy.yml for the bot.
CMD ["pnpm", "--filter", "api", "start:prod"]
