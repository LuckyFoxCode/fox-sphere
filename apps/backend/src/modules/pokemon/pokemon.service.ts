import { PokemonPoolItem } from "@fox-sphere/types";
import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";
import { BASE_POKEMON_POOL } from "./pokemon.constants";
import { fetchPokemon, fetchPokemonPoolData } from "./pokemon.helpers";

const TOP_UP_INTERVAL_MS = 5 * 60 * 1000;

export class PokemonService {
  private pokemonPool: PokemonPoolItem[] = [];
  private topUpTimer: NodeJS.Timeout | null = null;

  public async init(): Promise<void> {
    this.pokemonPool = await fetchPokemonPoolData();
    Logger.info(
      "PokemonService",
      `Loaded ${this.pokemonPool.length} base pokemons into memory pool.`,
    );

    this.setupEventListeners();
    this.startPoolTopUp();
  }

  public stop(): void {
    if (this.topUpTimer) {
      clearInterval(this.topUpTimer);
      this.topUpTimer = null;
    }
  }

  private startPoolTopUp(): void {
    if (this.pokemonPool.length >= BASE_POKEMON_POOL.length) {
      return;
    }

    this.topUpTimer = setInterval(() => {
      void this.topUpPool();
    }, TOP_UP_INTERVAL_MS);
    this.topUpTimer.unref();
  }

  private async topUpPool(): Promise<void> {
    const loadedSpecies = new Set(
      this.pokemonPool.map((item) => item.speciesName),
    );
    const missing = BASE_POKEMON_POOL.filter(
      (name) => !loadedSpecies.has(name),
    );

    if (missing.length === 0) {
      this.stop();
      return;
    }

    Logger.info(
      "PokemonService",
      `Topping up base pokemon pool: ${missing.length} missing (${missing.join(", ")}).`,
    );

    for (const name of missing) {
      try {
        const item = await fetchPokemon(name);
        const index = this.pokemonPool.findIndex(
          (poolItem) => poolItem.pokemonId === item.pokemonId,
        );
        if (index === -1) {
          this.pokemonPool.push(item);
        } else {
          this.pokemonPool[index] = item;
        }
        Logger.info(
          "PokemonService",
          `Topped up base pokemon "${item.speciesName}" (#${item.pokemonId}).`,
        );
      } catch (error) {
        Logger.error(
          "PokemonService",
          `Top-up failed for base pokemon "${name}"`,
          error,
        );
      }
    }

    if (this.pokemonPool.length === BASE_POKEMON_POOL.length) {
      Logger.info(
        "PokemonService",
        `Base pokemon pool is complete (${this.pokemonPool.length}/${BASE_POKEMON_POOL.length}).`,
      );
      this.stop();
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
        pokemonId: randomTemplate.pokemonId,
        speciesName: randomTemplate.speciesName,
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
