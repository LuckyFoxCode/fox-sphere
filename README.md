# 🦊 FoxSphere

Modern full-stack monorepo for Twitch integration and streaming tools.

## 🛠️ Tech Stack

- **Monorepo:** `pnpm workspaces`
- **Frontend:** Vue 3 (Composition API) + TypeScript + Vite
- **Backend:** Express.js + TypeScript + `tsx` (TS Execute)
- **Linter/Formatter:** ESLint & Biome

## 📂 Project Structure

```text
fox-sphere/
├── apps/
│   ├── backend/     # Express.js API
│   └── frontend/    # Vue 3 App
├── packages/        # Shared packages & configurations
├── package.json     # Global scripts & orchestration
└── pnpm-workspace.yaml
```
