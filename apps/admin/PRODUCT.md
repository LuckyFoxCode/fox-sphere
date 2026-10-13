# Product — Admin

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **luckyfoxcode** — primary operator, manages own channel and bot configuration
- **Channel admins** — other streamers and/or moderators who manage their own channels through the panel (multi-tenant, per `multi-tenant-architecture.md`)

## Product Purpose

The admin panel is the operator console for managing fox-sphere channels and inspecting their channel-scoped viewer balances. It provides a structured UI over the Express API (`apps/api` on `:3001`), with auto-generated typed clients from the OpenAPI spec. Deployed, but not publicly reachable: bound to loopback and opened through an SSH tunnel.

## Positioning

An internal operator console — not a SaaS dashboard, not user-facing. It exists to make channel management and bot configuration efficient for the people who run the bot.

## Operating Context

- In dev, runs on `:5174` (Vite dev server), proxying `/api` to `:3001`; in production, the same two apps are containers - Caddy serving the built SPA and proxying `/api`, published on `127.0.0.1:5174` and reached through `ssh -L 5174:localhost:5174`
- Talks to `apps/api` Express backend, which uses Prisma against the same Postgres database
- API client is auto-generated from `apps/api/openapi.json` via orval + vue-router
- Sidebar navigation with Dashboard and Channels pages
- Uses reka-ui primitives, tanstack vue-query for data fetching, lucide icons

## Capabilities and Constraints

- **Dashboard:** overview/landing with nav links to features
- **Channels:** list channels, create new channel, view channel details
- **Viewers** (per channel, read-only): paginated viewer balances, coin and xp leaderboards, and a viewer detail row
- Deployed but never publicly reachable — loopback-bound port plus an SSH tunnel, single allowlisted Twitch account
- Multi-tenant awareness planned (per-channel admin access)
- Single sign-on through Twitch OAuth — one allowlisted `ADMIN_TWITCH_USER_ID`, then an HMAC-signed session cookie (`requireSession`). No passwords and no user table
- Generated API client — routes defined once in `apps/api`, client regenerated from OpenAPI spec
- Tailwind 4, reka-ui components, shadcn-vue patterns

## Brand Commitments

None yet — clean slate. Uses shadcn-vue/ui component patterns but no custom brand identity.

## Evidence on Hand

- Working Vue 3.5 SFCs with reka-ui primitives
- Auto-generated typed API client from OpenAPI spec
- Sidebar navigation with Dashboard and Channels views
- Channel CRUD (list, create, detail)
- `DESIGN.md` (since 2026-08) and the shadcn token layer in `src/assets/styles/` — the panel is token-driven, not raw Tailwind defaults

## Product Principles

1. **Generated, not hand-written** — the API surface is declared once, the client is derived
2. **Local-first** — no public exposure; the panel is a loopback port reached through an SSH tunnel
3. **Feature modules** — each admin feature is an isolated route + component set
4. **Type-safe end to end** — from Prisma schema through OpenAPI to vue-query hooks
