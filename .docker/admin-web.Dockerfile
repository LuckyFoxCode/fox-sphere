# syntax=docker/dockerfile:1
# Admin panel image: the Vue SPA, served by Caddy, with /api proxied to the admin backend.
# Build context = repo root (the committed apps/api/openapi.json lives there, and the panel's
# build regenerates its typed client from it before Vite runs).
#
#   docker build -f .docker/admin-web.Dockerfile -t foxsphere-admin-web .
#
# Static and stateless: this image holds no session state and no secrets. The fx_session HMAC
# key belongs to the backend container and is never passed here. It is meant to be reached over
# an SSH tunnel, so Caddy serves plain HTTP and no certificate is provisioned.
#
# Sibling of .docker/admin.Dockerfile (the backend it proxies to) and .docker/web.Dockerfile
# (the overlay), which it mirrors in shape: node build stage, caddy:2-alpine runner.

# ==========================================
# Build the static panel
# ==========================================
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# apps/admin alone, and that is the whole difference from the overlay image: it is the one
# workspace member with no @fox-sphere/* dependency, so nothing else has to be installed and
# nothing has to be built. web.Dockerfile copies packages/types and packages/shared-schemas and
# runs `pnpm --filter "./packages/*" build` first; this one has no package build step at all.
# For the same reason `--filter "!@fox-sphere/db"` is absent here rather than copied - there is
# no ./packages/* glob left for it to exclude from, and no prisma generate, so this image never
# needs a DATABASE_URL. See .agents/rules/monorepo.md.
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

# Also brings apps/api/openapi.json, which orval reads in the next line - and every other
# member's package.json, which widens the workspace from two projects to nine. pnpm verifies its
# dependencies before running a script, so it installs the whole lockfile here anyway: slower
# than the manifest list above suggests, and invisible in the result, because /srv is the only
# thing that crosses into the runner. No --chown and no `USER node`, unlike
# .docker/bot-runtime.Dockerfile: nothing in this stage writes through a bind-mount back to the
# host, so the uid is an internal detail of a layer nothing else reads.
COPY . .
RUN pnpm --filter admin build

# ==========================================
# Serve with Caddy
# ==========================================
FROM caddy:2-alpine
COPY .docker/Caddyfile.admin /etc/caddy/Caddyfile
COPY --from=build /app/apps/admin/dist /srv
EXPOSE 80
