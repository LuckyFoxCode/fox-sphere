// Данные событий (Payloads)
export interface StreamXpUpdatePayload {
  lvl: number;
  newXp: number;
  maxXp: number;
}

export type StreamSystemStateResponse = StreamXpUpdatePayload;

export type StreamGetSystemStatePayload = Record<string, never>;

export type StreamLevelUpPayload = Pick<StreamXpUpdatePayload, "lvl">;

export interface StreamServerToClientEvents {
  "stream:xp-updated": (data: StreamXpUpdatePayload) => void;
  "stream:level-up": (data: StreamLevelUpPayload) => void;
}

export interface StreamClientToServerEvents {
  "stream:get-system-state": (
    _data: StreamGetSystemStatePayload,
    callback: (response: StreamSystemStateResponse) => void,
  ) => void;
}
