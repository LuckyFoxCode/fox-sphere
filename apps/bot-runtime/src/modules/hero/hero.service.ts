import { Logger, prisma } from "@fox-sphere/backend-shared";
import { getDefaultHero } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import { findChannelUser, resolveChannelContext } from "../channel";

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

  /**
   * `channelUserId` and `channelId` are both taken, and not by accident: `UserHero` carries
   * the channel as a plain column beside the relation, so it has to be written from somewhere,
   * and the caller that already holds the balance row is the only one that can guarantee the
   * two agree. A `ChannelUser.id` passed without its channel would either need a second lookup
   * or a default that could file a hero under the wrong channel.
   */
  public async ensureUserHasHero(
    channelUserId: number,
    channelId: string,
  ): Promise<string> {
    const existing = await prisma.userHero.findUnique({
      where: { channelUserId },
    });

    if (existing) {
      return existing.heroId;
    }

    // Deliberately the free default rather than a random catalog pick: every paid
    // hero would otherwise be handed out for free to whoever chatted first.
    const hero = getDefaultHero();

    try {
      await prisma.userHero.create({
        data: { channelUserId, channelId, heroId: hero.id },
      });
    } catch (error) {
      // Two callers can reach this for the same brand-new viewer - the `user:created`
      // handler and the lazy per-message path - and both miss the row before either
      // inserts it. `channelUserId` is unique, so the loser of that race gets P2002 and the
      // winner's hero is the one to keep.
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        const raced = await prisma.userHero.findUnique({ where: { channelUserId } });

        if (raced) {
          return raced.heroId;
        }
      }

      throw error;
    }

    return hero.id;
  }

  public async assignHeroToExistingUsersWithoutOne(): Promise<void> {
    const { channelId } = await resolveChannelContext();

    // Scoped to this channel on purpose: a hero is a property of the pair, so a viewer who
    // has been in this chat but not in another one is a genuine "without a hero" here, and
    // the sweep must not reach across channels to fix it.
    const channelUsersWithoutHero = await prisma.channelUser.findMany({
      where: { channelId, hero: null },
      select: { id: true },
    });

    if (channelUsersWithoutHero.length === 0) {
      Logger.info("HeroService", "All existing users already have a hero.");
      return;
    }

    Logger.info(
      "HeroService",
      `Found ${channelUsersWithoutHero.length} users without a hero. Distributing...`,
    );

    for (const channelUser of channelUsersWithoutHero) {
      try {
        await this.ensureUserHasHero(channelUser.id, channelId);
      } catch (error) {
        // One unwritable row must never abort the boot: `bootstrap()` rejecting here
        // takes the whole container down, and the remaining users would keep no hero.
        Logger.error(
          "HeroService",
          `Failed to assign a hero to channel user #${channelUser.id}`,
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
      const channelUser = await findChannelUser(twitchId);

      if (!channelUser) return;

      const heroId = await this.ensureUserHasHero(
        channelUser.id,
        channelUser.channelId,
      );

      Logger.info("HeroService", `Assigned hero "${heroId}" to @${username}`);

      // `userId` here is the balance row's id, so it is a `ChannelUser.id` - an unrelated
      // integer from the `User.id` it replaced. Nothing downstream may compare it with one:
      // the overlay keys a viewer by Twitch id and only displays this payload.
      globalEventBus.emit("hero:assigned", {
        userId: channelUser.id,
        username,
        heroId,
      });
    } catch (error) {
      Logger.error(
        "HeroService",
        `Failed to assign a hero to newly created user: ${username}`,
        error,
      );
    }
  }
}