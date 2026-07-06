# syntax=docker/dockerfile:1
# Edge image: builds the Vue overlay, serves it via Caddy, proxies Socket.io/API
# to the backend. Build context = repo root (needs workspace packages).
#
#   docker build -f .docker/web.Dockerfile -t foxsphere-web .
#
# Option A (Cloudflare Pages hosts the overlay instead): don't build this image;
# run a plain `caddy` with a proxy-only Caddyfile and set VITE_API_BASE_URL to
# the backend domain when building the frontend on Pages.

# ==========================================
# Build the static overlay
# ==========================================
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/types/package.json ./packages/types/
COPY packages/shared-schemas/package.json ./packages/shared-schemas/
RUN pnpm install --frozen-lockfile

COPY . .
# Empty -> same-origin (Option B). Set to the backend URL for Option A.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter "./packages/*" build && pnpm --filter frontend build

# ==========================================
# Serve with Caddy
# ==========================================
FROM caddy:2-alpine
COPY .docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/frontend/dist /srv
EXPOSE 80 443
