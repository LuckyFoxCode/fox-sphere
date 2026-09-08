# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **luckyfoxcode** — Twitch streamer, primary operator of the bot and overlay
- **Channel admins** — multiple streamers and/or moderators who manage channels through the admin panel

## Product Purpose

fox-sphere is a Twitch bot and live overlay system. It powers real-time interactive features (chat integration, XP/leveling, lottery, Pokemon arena) on stream via an OBS browser-source overlay, and provides an admin panel for managing channels and configuration. Success means a seamless, engaging live-stream experience for both the streamer and viewers.

## Positioning

A self-hosted, modular Twitch bot with a live overlay that goes beyond alerts — it runs mini-games, viewer progression, and interactive widgets directly on stream, all driven by a custom EventSub + Socket.io pipeline.

## Operating Context

- The bot-runtime connects to Twitch via EventSub and IRC, processes chat commands and events, and pushes real-time updates to the overlay through Socket.io
- The overlay runs as an OBS browser source on a single monitor/stream setup
- The admin panel runs locally (not deployed) on `:5174` and talks to an Express backend on `:3001`
- Development uses a pnpm monorepo with multiple local processes; production runs bot-runtime as a single process
- Postgres database stores channel config, user data, tokens, and system state

## Capabilities and Constraints

- Real-time chat, XP/leveling, lottery, Pokemon arena, timer widgets on stream
- Multi-channel architecture (planned multi-tenant per `multi-tenant-architecture.md`)
- Admin panel is local-only, not deployed to production
- Overlay is strictly OBS browser source — no mobile, no public-facing version
- The bot-runtime backend is the only deployed service
- No external CDN or asset pipeline for overlay assets
- Express 5, Vue 3.5, Prisma 7, Tailwind 4, TypeScript 6

## Product Principles

1. **Real-time first** — every feature is driven by live event data, not polling
2. **Self-contained** — one repo, one deployable, minimal external dependencies
3. **Modular by feature** — each widget/bot command is an isolated module
4. **Stream-native** — the overlay is designed for OBS, not repurposed from a web app
5. **Local admin** — the admin panel is a developer tool, not a SaaS product

## Evidence on Hand

- Working overlay with stream, lottery, Pokemon, and Twitch widgets
- Working admin panel with channel management (create, list, view)
- Prisma schema with User, TwitchToken, Channel, SystemState models
- AGENTS.md with comprehensive architecture documentation
- Multi-tenant architecture proposal in `apps/bot-runtime/docs/multi-tenant-architecture.md`
