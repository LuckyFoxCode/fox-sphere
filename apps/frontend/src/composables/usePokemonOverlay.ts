import { calculateNextStep, getRandomInt } from '@/components/pokemon/utils';
import type { PokemonAssignedPayload, TwitchChatMessagePayload } from '@fox-sphere/types';
import { ref } from 'vue';

export interface ActivePokemon extends Omit<PokemonAssignedPayload, 'pokemonId'> {
  currentX: number;
  direction: 1 | -1;
  isFlipped: boolean;
  moveDuration: number;
  isWalking: boolean;
  timeoutId: ReturnType<typeof setTimeout>;
  walkTimeoutId?: ReturnType<typeof setTimeout>;
  userLvl?: number;
  userColor?: string;
  userDisplayName?: string;
  isMod?: boolean;
  isVip?: boolean;
  isFollower?: boolean;
  isFounder?: boolean;
  isSubscriber?: boolean;
  isBroadcaster?: boolean;
  isBot?: boolean;
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
      const step = calculateNextStep(currentPokemon.currentX, currentPokemon.direction);

      if (step) {
        currentPokemon.direction = step.newDirection;
        currentPokemon.isFlipped = step.newDirection === 1;
        currentPokemon.moveDuration = step.moveDuration;
        currentPokemon.currentX = step.newX;
        currentPokemon.isWalking = true;

        const totalWait = step.moveDuration * 1000 + getRandomInt(400, 1200);

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
    const pauseDuration = getRandomInt(3500, 8000);

    currentPokemon.walkTimeoutId = setTimeout(scheduleNextAction, pauseDuration);
  };

  const initialDelay = getRandomInt(1000, 3000);
  pokemon.walkTimeoutId = setTimeout(scheduleNextAction, initialDelay);
}

export function usePokemonOverlay() {
  const handlePokemonMessage = (data: TwitchChatMessagePayload) => {
    if (!data.pokemon) return;

    const { userId, username, pokemon } = data;
    const existing = activePokemons.value.get(userId);

    if (existing) {
      clearTimeout(existing.timeoutId);
      existing.userLvl = data.userLvl;
      existing.userDisplayName = data.displayName;
      existing.userColor = data.color;
      existing.isMod = data.isMod;
      existing.isSubscriber = data.isSubscriber;
      existing.isVip = data.isVip || data.isPermanentVip;
      existing.isBroadcaster = data.isBroadcaster;
      existing.isBot = data.isBot;
      existing.isFollower = data.isFollower;
      existing.isFounder = data.isFounder;
      existing.timeoutId = setTimeout(() => removePokemon(userId), POKEMON_TTL);
      return;
    }

    const initialX = getRandomInt(10, 80);
    const timeoutId = setTimeout(() => removePokemon(userId), POKEMON_TTL);
    const initialDirection: 1 | -1 = Math.random() > 0.5 ? 1 : -1;

    const newPokemon: ActivePokemon = {
      userId: Number(userId),
      username,
      userDisplayName: data.displayName,
      userLvl: data.userLvl,
      userColor: data.color,
      isMod: data.isMod,
      isFollower: data.isFollower,
      isSubscriber: data.isSubscriber,
      isVip: data.isVip || data.isPermanentVip,
      isBroadcaster: data.isBroadcaster,
      isBot: data.isBot,
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
