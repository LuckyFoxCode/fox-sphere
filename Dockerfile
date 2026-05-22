# ==========================================
# ЭТАП 1: Сборка и подготовка (Builder)
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm

# Копируем конфиги монорепозитория
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-schemas/package.json ./packages/shared-schemas/

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY . .

# Генерируем типы Prisma Client
RUN pnpm --filter backend exec prisma generate

# Сначала собираем общие схемы, потом бэкенд
RUN pnpm --filter shared-schemas build
RUN pnpm --filter backend build

# ==========================================
# ЭТАП 2: Минимальный образ для запуска (Runner)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "--filter", "backend", "start"]