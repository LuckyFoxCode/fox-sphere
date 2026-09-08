# Product — Admin

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **luckyfoxcode** — primary operator, manages own channel and bot configuration
- **Channel admins** — other streamers and/or moderators who manage their own channels through the panel (multi-tenant, per `multi-tenant-architecture.md`)

## Product Purpose

The admin panel is a local development tool for managing fox-sphere channels, viewing bot status, and configuring stream settings. It provides a structured UI over the Express API (`apps/api` on `:3001`), with auto-generated typed clients from the OpenAPI spec. Not deployed to production.

## Positioning

An internal operator console — not a SaaS dashboard, not user-facing. It exists to make channel management and bot configuration efficient for the people who run the bot.

## Operating Context

- Runs locally on `:5174` (Vite dev server), proxies `/api` to `:3001`
- Talks to `apps/api` Express backend, which uses Prisma against the same Postgres database
- API client is auto-generated from `apps/api/openapi.json` via orval + vue-router
- Sidebar navigation with Dashboard and Channels pages
- Uses reka-ui primitives, tanstack vue-query for data fetching, lucide icons

## Capabilities and Constraints

- **Dashboard:** overview/landing with nav links to features
- **Channels:** list channels, create new channel, view channel details
- Local-only — never deployed, accessed only on localhost
- Multi-tenant awareness planned (per-channel admin access)
- No authentication yet (local-only makes it acceptable for now)
- Generated API client — routes defined once in `apps/api`, client regenerated from OpenAPI spec
- Tailwind 4, reka-ui components, shadcn-vue patterns

## Brand Commitments

None yet — clean slate. Uses shadcn-vue/ui component patterns but no custom brand identity.

## Evidence on Hand

- Working Vue 3.5 SFCs with reka-ui primitives
- Auto-generated typed API client from OpenAPI spec
- Sidebar navigation with Dashboard and Channels views
- Channel CRUD (list, create, detail)
- No DESIGN.md, no visual tokens beyond Tailwind defaults

## Product Principles

1. **Generated, not hand-written** — the API surface is declared once, the client is derived
2. **Local-first** — no auth, no deployment, no public exposure
3. **Feature modules** — each admin feature is an isolated route + component set
4. **Type-safe end to end** — from Prisma schema through OpenAPI to vue-query hooks
