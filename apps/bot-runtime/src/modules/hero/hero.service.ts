import { Logger, prisma } from "@fox-sphere/backend-shared";
import { HEROES } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";

/**
 * Owns hero assignment. Persisting and announcing are deliberately separate:
 * `ensureUserHasHero` never emits, so the startup backfill and the lazy
 * per-message assignment stay silent and only a genuinely new viewer produces
 * the "welcome" widget.
 */
export class HeroService {
  public init(): void {
    globalEventBus.on("user:created", (data) => {
      void this.assignToNewUser(data.twitchId, data.username);
    });
  }

  public async ensureUserHasHero(userId: number): Promise<string> {
    const existing = await prisma.userHero.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing.heroId;
    }

    const hero = HEROES[Math.floor(Math.random() * HEROES.length)];

    if (!hero) {
      throw new Error("Hero catalog is empty");
    }

    try {
      await prisma.userHero.create({
        data: { userId, heroId: hero.id },
      });
    } catch (error) {
      // Two callers can reach this for the same brand-new viewer - the `user:created`
      // handler and the lazy per-message path - and both miss the row before either
      // inserts it. `userId` is unique, so the loser of that race gets P2002 and the
      // winner's hero is the one to keep.
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        const raced = await prisma.userHero.findUnique({ where: { userId } });

        if (raced) {
          return raced.heroId;
        }
      }

      throw error;
    }

    return hero.id;
  }

  public async assignHeroToExistingUsersWithoutOne(): Promise<void> {
    const usersWithoutHero = await prisma.user.findMany({
      where: { hero: null },
      select: { id: true },
    });

    if (usersWithoutHero.length === 0) {
      Logger.info("HeroService", "All existing users already have a hero.");
      return;
    }

    Logger.info(
      "HeroService",
      `Found ${usersWithoutHero.length} users without a hero. Distributing...`,
    );

    for (const user of usersWithoutHero) {
      try {
        await this.ensureUserHasHero(user.id);
      } catch (error) {
        // One unwritable row must never abort the boot: `bootstrap()` rejecting here
        // takes the whole container down, and the remaining users would keep no hero.
        Logger.error(
          "HeroService",
          `Failed to assign a hero to user #${user.id}`,
          error,
        );
      }
    }
  }

  private async assignToNewUser(
    twitchId: string,
    username: string,
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { twitchId } });

      if (!user) return;

      const heroId = await this.ensureUserHasHero(user.id);

      Logger.info("HeroService", `Assigned hero "${heroId}" to @${username}`);

      globalEventBus.emit("hero:assigned", { userId: user.id, username, heroId });
    } catch (error) {
      Logger.error(
        "HeroService",
        `Failed to assign a hero to newly created user: ${username}`,
        error,
      );
    }
  }
}