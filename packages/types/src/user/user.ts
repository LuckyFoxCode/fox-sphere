// Данные событий (Payloads)
export interface UserCreatePayload {
  twitchId: string;
  username: string;
}

export interface UserLevelUpPayload {
  userId: string;
  username: string;
  newLevel: number;
}

export interface UserServerToClientEvents {
  "user:created": (data: UserCreatePayload) => void;
  "user:level-up": (data: UserLevelUpPayload) => void;
}
export interface UserClientToServerEvents {}
