import type { PokemonAssignedPayload, TwitchChatMessagePayload } from '@fox-sphere/types';
import { ref } from 'vue';

export interface ActivePokemon extends Omit<PokemonAssignedPayload, 'pokemonId'> {
  currentX: number;
  direction: 1 | -1;
  isFlipped: boolean;
  moveDuration: number;
  isWalking: boolean;
  timeoutId: ReturnType<typeof setTimeout>;
  walkTimeoutId?: ReturnType<typeof setInterval>;
}

const POKEMON_TTL = 5 * 60 * 1000;

const activePokemons = ref(new Map<string, ActivePokemon>());

function startRandomWalking(userId: string) {
  const pokemon = activePokemons.value.get(userId);
  if (!pokemon) return;

  if (pokemon.walkTimeoutId) {
    clearInterval(pokemon.walkTimeoutId);
  }

  const scheduleNextAction = () => {
    const currentPokemon = activePokemons.value.get(userId);
    if (!currentPokemon) return;

    if (pokemon.walkTimeoutId) {
      clearTimeout(pokemon.walkTimeoutId);
    }

    const shouldWalk = Math.random() > 0.5;

    if (shouldWalk) {
      if (currentPokemon.currentX >= 95) {
        currentPokemon.direction = -1; // left
      } else if (currentPokemon.currentX <= 1) {
        currentPokemon.direction = 1; // right
      }

      const stepDistance = Math.floor(Math.random() * 18) + 8;

      let potentialX = currentPokemon.currentX + stepDistance * currentPokemon.direction;

      const newX = Math.min(Math.max(potentialX, 1), 95);

      const actualDistance = Math.abs(newX - currentPokemon.currentX);

      if (actualDistance > 0) {
        const speedFactor = 0.45;
        const moveDuration = Math.max(1.5, Number((actualDistance * speedFactor).toFixed(1)));

        currentPokemon.isFlipped = currentPokemon.direction === 1;
        currentPokemon.moveDuration = moveDuration;
        currentPokemon.currentX = newX;
        currentPokemon.isWalking = true;

        const totalWait = moveDuration * 1000 + (Math.floor(Math.random() * 800) + 400);

        currentPokemon.walkTimeoutId = setTimeout(() => {
          if (activePokemons.value.has(userId)) {
            activePokemons.value.get(userId)!.isWalking = false;
            scheduleNextAction();
          }
        }, totalWait);
        return;
      }
    }

    currentPokemon.isWalking = false;
    const pauseDuration = Math.floor(Math.random() * 4500) + 3500;

    currentPokemon.walkTimeoutId = setTimeout(() => {
      scheduleNextAction();
    }, pauseDuration);
  };

  const initialDelay = Math.floor(Math.random() * 2000) + 1000;
  pokemon.walkTimeoutId = setTimeout(scheduleNextAction, initialDelay);
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
    const initialDirection = Math.random() > 0.5 ? 1 : -1;

    const newPokemon: ActivePokemon = {
      userId: Number(userId),
      username,
      speciesName: pokemon.speciesName,
      spriteUrl: pokemon.spriteUrl,
      currentX: initialX,
      direction: initialDirection,
      isFlipped: initialDirection === 1,
      moveDuration: 0,
      isWalking: false,
      timeoutId,
    };

    activePokemons.value.set(userId, newPokemon);

    startRandomWalking(userId);
  };

  const removePokemon = (userId: string) => {
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearTimeout(existing.timeoutId);
      if (existing.walkTimeoutId) {
        clearInterval(existing.walkTimeoutId);
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
