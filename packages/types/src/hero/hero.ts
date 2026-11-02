// Сущность (Data Transfer Object)
export interface HeroRef {
  heroId: string;
}

// Данные событий (Payloads)
export interface HeroAssignedPayload extends HeroRef {
  userId: number;
  username: string;
}

/**
 * `twitchId`, а не `userId`: лейн ключует зрителя по Twitch id, а `hero:assigned` носит
 * `ChannelUser.id` - разные числа из разных последовательностей.
 */
export interface HeroChangedPayload extends HeroRef {
  twitchId: string;
}

// Контракты событий Socket.io
export interface HeroServerToClientEvents {
  "hero:assigned": (data: HeroAssignedPayload) => void;
  "hero:changed": (data: HeroChangedPayload) => void;
}

export interface HeroClientToServerEvents {}