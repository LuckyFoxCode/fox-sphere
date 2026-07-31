import { PokemonPoolItem } from "@fox-sphere/types";
import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";
import { fetchPokemonPoolData } from "./pokemon.helpers";

export class PokemonService {
  private pokemonPool: PokemonPoolItem[] = [];

  public async init(): Promise<void> {
    try {
      this.pokemonPool = await fetchPokemonPoolData();
      Logger.info(
        "PokemonService",
        `Loaded ${this.pokemonPool.length} base pokemons into memory pool.`,
      );
    } catch (error) {
      Logger.error(
        "PokemonService",
        "Failed to fetch base pokemon pool",
        error,
      );
    }
  }

  private setupEventListeners(): void {
    globalEventBus.on("user:created", async (data) => {
      try {
        const user = await prisma.user.findUnique({
          where: { twitchId: data.twitchId },
        });

        if (user) {
          await this.ensureUserHasPokemon(user.id);
        }
      } catch (error) {
        Logger.error(
          "PokemonService",
          `Failed to assign pokemon to newly created user: ${data.username}`,
          error,
        );
      }
    });
  }

  public getRandomPokemonFromPool(): PokemonPoolItem {
    if (this.pokemonPool.length === 0) {
      throw new Error("Pokemon pool is not initialized!");
    }

    const randomIndex = Math.floor(Math.random() * this.pokemonPool.length);
    return this.pokemonPool[randomIndex];
  }

  public async ensureUserHasPokemon(userId: number) {
    const existingPokemon = await prisma.userPokemon.findUnique({
      where: { userId },
    });

    if (existingPokemon) {
      return existingPokemon;
    }

    const randomTemplate = this.getRandomPokemonFromPool();

    const newPokemon = await prisma.userPokemon.create({
      data: {
        userId,
        pokemonId: randomTemplate.id,
        speciesName: randomTemplate.name,
        spriteUrl: randomTemplate.spriteUrl,
        lvl: 1,
        xp: 0,
        evolutionStage: 1,
      },
      include: {
        user: true,
      },
    });

    Logger.info(
      "PokemonService",
      `Assigned pokemon ${newPokemon.speciesName} (#${newPokemon.pokemonId}) to user @${newPokemon.user.username}`,
    );

    globalEventBus.emit("pokemon:assigned", {
      userId: newPokemon.userId,
      username: newPokemon.user.username,
      pokemonId: newPokemon.pokemonId,
      speciesName: newPokemon.speciesName,
      spriteUrl: newPokemon.spriteUrl,
    });

    return newPokemon;
  }

  public async asignPokemonToExistingUsersWithoutOne(): Promise<void> {
    const usersWithoutPokemon = await prisma.user.findMany({
      where: { pokemon: null },
      select: { id: true, username: true },
    });

    if (usersWithoutPokemon.length === 0) {
      Logger.info(
        "PokemonService",
        "All existing users already have pokemons.",
      );
      return;
    }

    Logger.info(
      "PokemonService",
      `Found ${usersWithoutPokemon.length} users without pokemon. Distributing...`,
    );

    for (const user of usersWithoutPokemon) {
      await this.ensureUserHasPokemon(user.id);
    }
  }
}
