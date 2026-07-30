import { BASE_POKEMON_POOL } from "./pokemon.constants";

export async function fetchPokemonPoolData() {
  const poolData = await Promise.all(
    BASE_POKEMON_POOL.map(async (name) => {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        spriteUrl:
          data.sprites.versions["generation-v"]["black-white"].animated
            .front_default || data.sprites.front_default,
      };
    }),
  );

  return poolData;
}
