# syntax=docker/dockerfile:1

# ==========================================
# Base: Node 24 LTS + pinned pnpm via corepack
# ==========================================
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
WORKDIR /app

# ==========================================
# Dependencies: install once, cache by manifests
# ==========================================
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-schemas/package.json ./packages/shared-schemas/
RUN pnpm install --frozen-lockfile

# ==========================================
# Dev: hot reload. Source is bind-mounted by compose,
# node_modules come from this image via named volumes.
# DATABASE_URL is injected at runtime by compose.
# ==========================================
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "--filter", "backend", "dev"]

# ==========================================
# Build: compile shared-schemas + backend, generate Prisma client.
# ARG keeps DATABASE_URL build-only (never persisted in any image layer
# that ships) — prisma generate resolves env() but never connects.
# ==========================================
FROM deps AS build
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL
COPY . .
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter shared-schemas build
RUN pnpm --filter backend build

# ==========================================
# Runner: minimal production image, non-root
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "backend", "start"]
