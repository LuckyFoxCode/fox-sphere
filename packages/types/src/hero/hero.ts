import type { HeroDefinition } from "./heroes";

// Сущность (Data Transfer Object)
export interface HeroRef {
  heroId: string;
}

// Данные событий (Payloads)
export interface HeroAssignedPayload extends HeroRef {
  userId: number;
  username: string;
}

// Контракты событий Socket.io
export interface HeroServerToClientEvents {
  "hero:assigned": (data: HeroAssignedPayload) => void;
}

export interface HeroClientToServerEvents {}

export type { HeroDefinition };