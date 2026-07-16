// Данные событий (Payloads)
export interface StreamXpUpdatePayload {
  lvl: number;
  newXp: number;
  maxXp: number;
}

export type StreamLevelUpPayload = Pick<StreamXpUpdatePayload, "lvl">;

export interface StreamServerToClientEvents {
  "stream:xp-updated": (data: StreamXpUpdatePayload) => void;
  "stream:level-up": (data: StreamLevelUpPayload) => void;
}

export interface StreamClientToServerEvents {}
