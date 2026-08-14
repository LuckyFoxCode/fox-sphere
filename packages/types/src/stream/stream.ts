export type XpBoostSource = "auto" | "command";

export interface StreamXpBoostState {
  multiplier: number;
  expiresAt: number | null;
}

// Данные событий (Payloads)
export interface StreamXpBoostPayload {
  multiplier: number;
  expiresAt: number;
  source: XpBoostSource;
}

export interface StreamXpUpdatePayload {
  lvl: number;
  newXp: number;
  maxXp: number;
  startXp: number;
}

export type StreamSystemStateResponse = StreamXpUpdatePayload & {
  xpBoost: StreamXpBoostState | null;
};

export type StreamGetSystemStatePayload = Record<string, never>;

export type StreamLevelUpPayload = Pick<StreamXpUpdatePayload, "lvl">;

export interface StreamServerToClientEvents {
  "stream:xp-updated": (data: StreamXpUpdatePayload) => void;
  "stream:level-up": (data: StreamLevelUpPayload) => void;
  "stream:xp-boost": (data: StreamXpBoostPayload) => void;
}

export interface StreamClientToServerEvents {
  "stream:get-system-state": (
    _data: StreamGetSystemStatePayload,
    callback: (response: StreamSystemStateResponse) => void,
  ) => void;
}
