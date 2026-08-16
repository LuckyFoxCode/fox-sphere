# 🦊 FoxSphere

Modern full-stack monorepo for Twitch integration and streaming tools.

## Overview

FoxSphere is a self-hosted ecosystem that connects a Twitch channel to a set of
live overlay widgets, chat tools, and stream-economy features. The backend
subscribes to Twitch events and chats, pushes realtime data to clients over
Socket.io, while the frontend renders browser-source overlays for OBS / Streamlabs.

### Features

- **Chat & overlay widgets** — chat widget, timer, stream frame, and VIP widgets for the overlay
- **Pokémon overlay arena** — active Pokémon walk across the footer, with rank badges, role-colored borders, and chat message speech bubbles (with Twitch emotes)
- **Streamer XP system** — XP and levels driven by chat activity
- **VIP lottery** — automatic VIP giveaways from chat commands
- **Raid system** — raid command support
- **Stream events** — Twitch event subscriptions for live activity

## Monorepo Layout

```text
fox-sphere/
├── apps/
│   ├── backend/              # Express + Prisma + Socket.io API & Twitch integration
│   └── frontend/             # Vue 3 overlay widgets
├── packages/
│   ├── types/                # Shared TypeScript types (@fox-sphere/types)
│   └── shared-schemas/       # Shared validation schemas (@fox-sphere/shared-schemas)
├── docs/                     # Guides & workflows
├── .docker/                  # Dockerfiles
├── .github/workflows/        # CI/CD (deploy)
├── package.json              # Global scripts & orchestration
└── pnpm-workspace.yaml       # Workspace definition (apps/*, packages/*)
```

## Tech Stack

- **Monorepo:** `pnpm workspaces`
- **Frontend:** Vue 3 (Composition API) + TypeScript + Vite
- **Backend:** Express.js + TypeScript + `tsx` (TS Execute)
- **Database:** PostgreSQL + Prisma ORM
- **Realtime:** Socket.io
- **Twitch:** `@twurple` (chat, API, EventSub)
- **Linter/Formatter:** ESLint & Prettier
- **Infra:** Docker Compose, GitHub Actions, GHCR

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Docker + Docker Compose (for PostgreSQL and backend hot-reload)

### Quick Start

```sh
# 1. PostgreSQL + backend (hot reload) in the background
docker compose up -d

# 2. Twitch bot worker (in a separate terminal)
pnpm worker:t

# 3. Frontend overlay
pnpm dev:f

# Optional: Prisma Studio to inspect the database
pnpm prisma:s
```

The frontend overlay is meant to be added to OBS as a Browser Source; the backend
is exposed on `:3000` (Socket.io + REST).

### Environment

- Dev: copy `apps/backend/.env.example` → `apps/backend/.env` and fill Twitch credentials
- Prod: see `.env.prod.example` (used by `docker-compose.prod.yml` on the VM; never commit real values)

## Scripts

| Script           | Description                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm dev:f`      | Run frontend dev server (Vite)                     |
| `pnpm dev:b`      | Run backend dev server (tsx watch)                 |
| `pnpm build`      | Build shared packages + frontend                   |
| `pnpm build:f`    | Build frontend                                     |
| `pnpm build:b`    | Build backend                                      |
| `pnpm lint:f`     | Lint frontend (ESLint)                             |
| `pnpm lint:b`     | Lint backend (ESLint)                              |
| `pnpm format:f`   | Format frontend                                    |
| `pnpm prisma:g`   | Generate Prisma client                             |
| `pnpm prisma:m`   | Run Prisma migration (dev)                         |
| `pnpm prisma:s`   | Open Prisma Studio                                 |
| `pnpm worker:t`   | Run the Twitch worker                              |
| `pnpm new:pkg`    | Scaffold a new package                             |

## Docker & Deployment

- **Dev (`docker-compose.yml`):** PostgreSQL + backend in watch mode; frontend runs in the terminal.
- **Prod (`docker-compose.prod.yml`):** production stack driven by `.env.prod` on the target VM.
- **CI/CD:** pushing to `main` triggers `.github/workflows/deploy.yml` — ARM64 images are built, pushed to GHCR, and rolled out on the Oracle VM over SSH.

## Development Workflow & Releases

### Branch model

```text
feature/*  --(PR)-->  dev  --(PR)-->  main  --(tag)-->  vX.Y.Z
```

1. Create a feature branch from `dev` (`feat/DEV-<id>-<slug>`, `fix/DEV-<id>-<slug>`, `refactor/DEV-<id>-<slug>` — the Linear issue ID makes Linear link the branch to the issue automatically)
2. Open a PR into `dev`
3. Merge `dev` into `main`
4. Tag the release on `main`

### Conventional commits

Commit messages follow the conventional-commit format with the Linear issue ID prefix: `DEV-<id> type(scope): subject`

- `DEV-16 feat(...)` — new feature → minor release
- `DEV-16 fix(...)` — bug fix → patch release
- `DEV-16 docs(...)` — documentation only → no version bump
- `DEV-16 refactor(...)` — behavior-neutral refactor → patch release
- `DEV-16 feat(...)!:` / breaking change → major release

### Release tags (semver)

Releases are tagged on `main` only:

- `v1.0.0` — Twitch chat widget integration
- `v1.1.0` — Pokémon overlay & stream XP
- next fix → `v1.1.1`

## Documentation

- Frontend: [`apps/frontend/README.md`](apps/frontend/README.md)
- Backend guides: [`apps/backend/docs/`](apps/backend/docs/)
- Adding a package: [`docs/adding-a-package.md`](docs/adding-a-package.md)
