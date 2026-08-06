// Сущность (Data Transfer Object)
export interface PokemonPoolItem {
  pokemonId: number;
  speciesName: string;
  spriteUrl: string;
}

// Данные событий (Payloads)
export interface PokemonAssignedPayload extends PokemonPoolItem {
  userId: number;
  username: string;
}

// Контракты событий Socket.io
export interface PokemonServerToClientEvents {
  "pokemon:assigned": (data: PokemonAssignedPayload) => void;
}

export interface PokemonClientToServerEvents {}
