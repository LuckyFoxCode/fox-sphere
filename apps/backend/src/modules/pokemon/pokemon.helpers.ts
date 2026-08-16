import { PokemonPoolItem } from "@fox-sphere/types";
import { Logger } from "../../shared/services";
import { fetchWithRetry } from "../../shared/utils";
import { BASE_POKEMON_POOL } from "./pokemon.constants";

interface PokeApiPokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    versions: {
      "generation-v": {
        "black-white": {
          animated: { front_default: string | null };
        };
      };
    };
  };
}

export async function fetchPokemon(name: string): Promise<PokemonPoolItem> {
  const res = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${name}`);
  const data = (await res.json()) as PokeApiPokemon;

  return {
    pokemonId: data.id,
    speciesName: data.name,
    spriteUrl:
      data.sprites.versions["generation-v"]["black-white"].animated
        .front_default || data.sprites.front_default,
  };
}

export async function fetchPokemonPoolData(): Promise<PokemonPoolItem[]> {
  const results = await Promise.all(
    BASE_POKEMON_POOL.map(async (name) => {
      try {
        return await fetchPokemon(name);
      } catch (error) {
        Logger.error(
          "PokemonService",
          `Failed to fetch base pokemon "${name}"`,
          error,
        );
        return null;
      }
    }),
  );

  const poolData = results.filter(
    (item): item is PokemonPoolItem => item !== null,
  );

  if (poolData.length === 0) {
    throw new Error(
      `Failed to fetch the base pokemon pool: all ${BASE_POKEMON_POOL.length} requests failed after retries`,
    );
  }

  return poolData;
}
