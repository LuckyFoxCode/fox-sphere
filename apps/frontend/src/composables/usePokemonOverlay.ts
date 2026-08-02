import type { PokemonAssignedPayload, TwitchChatMessagePayload } from '@fox-sphere/types';
import { ref } from 'vue';

export interface ActivePokemon extends Omit<PokemonAssignedPayload, 'pokemonId'> {
  timeoutId: ReturnType<typeof setTimeout>;
}

const POKEMON_TTL = 5 * 60 * 1000;

const activePokemons = ref(new Map<string, ActivePokemon>());

export function usePokemonOverlay() {
  const handlePokemonMessage = (data: TwitchChatMessagePayload) => {
    if (!data.pokemon) return;

    const { userId, username, pokemon } = data;
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearInterval(existing.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      removePokemom(userId);
    }, POKEMON_TTL);

    activePokemons.value.set(userId, {
      userId: Number(userId),
      username,
      speciesName: pokemon.speciesName,
      spriteUrl: pokemon.spriteUrl,
      timeoutId,
    });
  };

  const removePokemom = (userId: string) => {
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearTimeout(existing.timeoutId);
      activePokemons.value.delete(userId);
    }
  };

  return {
    activePokemons,
    handlePokemonMessage,
  };
}
