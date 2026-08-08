// Данные событий (Payloads)
export interface UserCreatePayload {
  twitchId: string;
  username: string;
}

export interface UserLevelUpPayload {
  userId: string;
  username: string;
  newLevel: number;
  pokemon?: UserPokemonPayload;
}

export interface UserPokemonPayload {
  speciesName: string;
  spriteUrl: string;
  lvl: number;
  xp: number;
  isReadyToEvolve: boolean;
}

export interface UserServerToClientEvents {
  "user:created": (data: UserCreatePayload) => void;
  "user:level-up": (data: UserLevelUpPayload) => void;
}
export interface UserClientToServerEvents {}
