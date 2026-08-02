import type { PokemonAssignedPayload, TwitchChatMessagePayload } from '@fox-sphere/types';
import { ref } from 'vue';

export interface ActivePokemon extends Omit<PokemonAssignedPayload, 'pokemonId'> {
  currentX: number;
  isFlipped: boolean;
  moveDuration: number;
  timeoutId: ReturnType<typeof setTimeout>;
  walkIntervalId?: ReturnType<typeof setInterval>;
}

const POKEMON_TTL = 5 * 60 * 1000;

const activePokemons = ref(new Map<string, ActivePokemon>());

function startRandomWalking(userId: string) {
  const pokemon = activePokemons.value.get(userId);
  if (!pokemon) return;

  if (pokemon.walkIntervalId) {
    clearInterval(pokemon.walkIntervalId);
  }

  const walkStep = () => {
    const currentPokemon = activePokemons.value.get(userId);
    if (!currentPokemon) return;

    const newX = Math.floor(Math.random() * 80) + 5;
    const distance = Math.abs(newX - currentPokemon.currentX);

    if (distance >= 5) {
      currentPokemon.isFlipped = newX > currentPokemon.currentX;
      currentPokemon.moveDuration = Math.max(2, Math.round(distance * 0.25));
      currentPokemon.currentX = newX;
    }

    const nextInterval = Math.floor(Math.random() * 4000) + 6000;
    currentPokemon.walkIntervalId = setTimeout(walkStep, nextInterval);
  };

  const initialDelay = Math.floor(Math.random() * 4000) + 6000;
  pokemon.walkIntervalId = setTimeout(walkStep, initialDelay);
}

export function usePokemonOverlay() {
  const handlePokemonMessage = (data: TwitchChatMessagePayload) => {
    if (!data.pokemon) return;

    const { userId, username, pokemon } = data;
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearTimeout(existing.timeoutId);

      const newTimeoutId = setTimeout(() => {
        removePokemon(userId);
      }, POKEMON_TTL);

      existing.timeoutId = newTimeoutId;
      return;
    }

    const initialX = Math.floor(Math.random() * 70) + 10;
    const timeoutId = setTimeout(() => removePokemon(userId), POKEMON_TTL);

    const newPokemon: ActivePokemon = {
      userId: Number(userId),
      username,
      speciesName: pokemon.speciesName,
      spriteUrl: pokemon.spriteUrl,
      currentX: initialX,
      isFlipped: false,
      moveDuration: 0,
      timeoutId,
    };

    activePokemons.value.set(userId, newPokemon);

    startRandomWalking(userId);
  };

  const removePokemon = (userId: string) => {
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearTimeout(existing.timeoutId);
      if (existing.walkIntervalId) {
        clearInterval(existing.walkIntervalId);
      }
      activePokemons.value.delete(userId);
    }
  };

  return {
    activePokemons,
    handlePokemonMessage,
    removePokemon,
  };
}
