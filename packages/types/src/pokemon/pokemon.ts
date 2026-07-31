// Сущность (Data Transfer Object)
export interface PokemonPoolItem {
  id: number;
  name: string;
  spriteUrl: string;
}

// Данные событий (Payloads)
export interface PokemonAssignedPayload {
  userId: number;
  username: string;
  pokemonId: number;
  speciesName: string;
  spriteUrl: string;
}

// Контракты событий Socket.io
export interface PokemonServerToClientEvents {
  "pokemon:assigned": (data: PokemonAssignedPayload) => void;
}

export interface PokemonClientToServerEvents {}
