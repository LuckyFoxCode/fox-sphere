# syntax=docker/dockerfile:1

# ==========================================
# Base: Node 24 LTS + pinned pnpm via corepack
# ==========================================
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
WORKDIR /app

# --- Run everything as the built-in non-root `node` user (uid 1000). ---------
# WHY: the dev stack bind-mounts ./apps/bot-runtime and ./packages into the
# container (see docker-compose.yml). Anything the container writes back into
# those mounts — Prisma client in packages/db/src/generated/, tsdown output in
# packages/*/dist — lands on the HOST with the writer's UID. If the container
# runs as root (the default), those files become root:root on the host and a
# later host-side `pnpm build` dies with:
#     EACCES: permission denied, unlink '.../src/generated/prisma/client.ts'
# The `node` user is uid 1000, which matches the typical host developer UID, so
# generated files come out owned by the host user and host rebuilds just work.
#
# ONE-TIME FIX for files already owned by root (left over from before this
# change) — remove them as root, then rebuild normally as yourself:
#     sudo rm -rf packages/db/src/generated packages/*/dist
#     pnpm build            # host: packages + frontend
#     docker compose build  # backend (Prisma client regenerated in-container)
# (chown also works: sudo chown -R "$USER:$USER" packages/db/src/generated)
RUN chown -R node:node /app
USER node

# ==========================================
# Dependencies: install once, cache by manifests
# ==========================================
FROM base AS deps
# --chown so the copied manifests + resulting node_modules belong to `node`,
# which also seeds the named node_modules volumes with node ownership.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/bot-runtime/package.json ./apps/bot-runtime/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/shared-schemas/package.json ./packages/shared-schemas/
COPY --chown=node:node packages/backend-shared/package.json ./packages/backend-shared/
COPY --chown=node:node packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# ==========================================
# Dev: hot reload. Source is bind-mounted by compose,
# node_modules come from this image via named volumes.
# Runs as `node` (inherited from base) — see the ownership note above.
# DATABASE_URL is injected at runtime by compose.
# ==========================================
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "--filter", "bot-runtime", "dev"]

# ==========================================
# Build: compile packages + bot-runtime, generate Prisma client.
# ARG keeps DATABASE_URL build-only (never persisted in any image layer
# that ships) — prisma generate resolves env() but never connects.
# ==========================================
FROM deps AS build
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL
COPY --chown=node:node . .
RUN pnpm --filter @fox-sphere/db exec prisma generate
# bot-runtime imports @fox-sphere/types, @fox-sphere/shared-schemas and
# @fox-sphere/backend-shared.
RUN pnpm --filter "./packages/*" build
RUN pnpm --filter bot-runtime build

# ==========================================
# Runner: minimal production image, non-root (`node`, inherited from base)
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
# Only the deployed app plus the packages it imports. `apps/api` and `apps/admin` are
# local-only tools - copying all of ./apps used to ship their source AND install their
# dependencies (vue, @tanstack/vue-query, swagger-ui-express) into the production image.
# `pnpm install --frozen-lockfile` tolerates workspace members that are absent from the
# context, so the lockfile stays authoritative with only these two directories present.
COPY --from=build --chown=node:node /app/apps/bot-runtime ./apps/bot-runtime
COPY --from=build --chown=node:node /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Merged server + Twitch worker in one process (see src/prod.ts). `prisma migrate
# deploy` is run separately by the deploy pipeline via `pnpm --filter @fox-sphere/db`.
CMD ["pnpm", "--filter", "bot-runtime", "start:prod"]
