import { Logger, prisma } from "@fox-sphere/backend-shared";
import { getDefaultHero, type HeroDefinition } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import { findChannelUser, requireChannelUser, resolveChannelContext } from "../channel";

/**
 * The three answers a purchase can give.
 *
 * All of them are values rather than throws: "already owned" and "not enough coins" are the
 * normal outcomes of a shop command, and the command registry logs a throw as a failure. The
 * only exception left is a viewer with no balance row, which is a bug rather than a state.
 */
export type BuyHeroResult =
  | { status: "bought"; coinsAfter: number }
  | { status: "already-owned" }
  | { status: "insufficient-funds"; coins: number; shortfall: number };

/**
 * The three answers an equip can give.
 *
 * Values rather than throws for the same reason as `BuyHeroResult`: "already active" and
 * "not owned" are ordinary shop states, and the registry logs a throw as a failure. A viewer
 * with no balance row still throws, because that is a bug and not a state.
 */
export type EquipHeroResult = "equipped" | "already-active" | "not-owned";

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
   *
   * Three steps, because a viewer can now own several heroes and exactly one of them is active:
   * the active row answers, an owned-but-flagless collection is healed in place, and only a
   * viewer with no row at all gets a new one.
   */
  public async ensureUserHasHero(
    channelUserId: number,
    channelId: string,
  ): Promise<string> {
    const active = await prisma.userHero.findFirst({
      where: { channelUserId, isActive: true },
    });

    if (active) {
      return active.heroId;
    }

    // Окно между `migrate deploy` и сменой контейнера: старый контейнер успевает создать
    // строки без `isActive`, и такой зритель пропадает из лейна. Лечим на первом же сообщении.
    const owned = await prisma.userHero.findMany({ where: { channelUserId } });

    if (owned.length > 0) {
      const preferred =
        owned.find((row) => row.heroId === getDefaultHero().id) ?? owned[0]!;

      await prisma.userHero.updateMany({
        where: { id: preferred.id },
        data: { isActive: true },
      });

      return preferred.heroId;
    }

    // Deliberately the free default rather than a random catalog pick: every paid
    // hero would otherwise be handed out for free to whoever chatted first.
    const hero = getDefaultHero();

    try {
      await prisma.userHero.create({
        data: { channelUserId, channelId, heroId: hero.id, isActive: true },
      });
    } catch (error) {
      // Two callers can reach this for the same brand-new viewer - the `user:created`
      // handler and the lazy per-message path - and both miss the row before either
      // inserts it. `(channelUserId, heroId)` is unique and `UserHero_one_active_per_user`
      // allows one active row, so the loser of that race gets P2002 and the winner's hero
      // is the one to keep.
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        const raced = await prisma.userHero.findFirst({
          where: { channelUserId, isActive: true },
        });

        if (raced) {
          return raced.heroId;
        }
      }

      throw error;
    }

    return hero.id;
  }

  /**
   * Sells one catalog hero to one viewer: the debit, the ownership row and the ledger row in
   * one transaction.
   *
   * The ownership check and the balance check run before the transaction for the sake of a
   * human answer - `shortfall` cannot be computed from a rolled-back transaction. The
   * transaction then re-checks the balance atomically, because the row it read could have been
   * spent between the two, the same guard `roulette.service.ts` uses. A zero-price hero is
   * granted with no debit and no ledger row: an amount of `0` in `CoinHistory` would claim
   * money moved.
   *
   * `isActive` is left at its `false` default on purpose - buying is not equipping, and
   * `UserHero_one_active_per_user` allows exactly one active row anyway.
   */
  public async buyHero(twitchId: string, hero: HeroDefinition): Promise<BuyHeroResult> {
    const channelUser = await requireChannelUser(twitchId);

    const owned = await prisma.userHero.findUnique({
      where: { channelUserId_heroId: { channelUserId: channelUser.id, heroId: hero.id } },
    });

    if (owned) {
      return { status: "already-owned" };
    }

    if (channelUser.coins < hero.price) {
      return {
        status: "insufficient-funds",
        coins: channelUser.coins,
        shortfall: hero.price - channelUser.coins,
      };
    }

    try {
      const coinsAfter = await prisma.$transaction(async (tx) => {
        // Атомарное списание с условием достаточности: проверка выше читала баланс раньше.
        // При `count === 0` ничего не записано, поэтому пустая транзакция коммитится вхолостую.
        const debited = await tx.channelUser.updateMany({
          where: { id: channelUser.id, coins: { gte: hero.price } },
          data: { coins: { decrement: hero.price } },
        });

        if (debited.count === 0) {
          return null;
        }

        await tx.userHero.create({
          data: {
            channelUserId: channelUser.id,
            channelId: channelUser.channelId,
            heroId: hero.id,
          },
        });

        // Ноль в истории монет значил бы "деньги двигались". Бесплатный герой просто выдаётся.
        if (hero.price > 0) {
          await tx.coinHistory.create({
            data: {
              channelId: channelUser.channelId,
              channelUserId: channelUser.id,
              amount: -hero.price,
              reason: "HERO_PURCHASE",
              details: `Hero: ${hero.id}`,
            },
          });
        }

        return channelUser.coins - hero.price;
      });

      if (coinsAfter === null) {
        const fresh = await requireChannelUser(twitchId);

        return {
          status: "insufficient-funds",
          coins: fresh.coins,
          shortfall: Math.max(0, hero.price - fresh.coins),
        };
      }

      return { status: "bought", coinsAfter };
    } catch (error) {
      // P2002 на `(channelUserId, heroId)`: такую же покупку успели провести между проверкой
      // и вставкой. Транзакция откатилась целиком, включая списание.
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        return { status: "already-owned" };
      }

      throw error;
    }
  }

  /**
   * Switches the active hero to one the viewer already owns.
   *
   * The ownership row is the gate: a hero bought but never equipped has `isActive: false`, and
   * an unknown id simply has no row, so both are answered here rather than in the command. The
   * two writes share a transaction because `UserHero_one_active_per_user` permits one active row
   * per viewer - the old flag has to come off before the new one goes on, and a failure between
   * them would otherwise leave the viewer with no active hero at all.
   *
   * Two concurrent equips of one viewer are deliberately not retried: the bot is a single
   * process and commands run one at a time, so a `P2002` here would be a real defect and the
   * registry logs it as one.
   */
  public async equipHero(twitchId: string, heroId: string): Promise<EquipHeroResult> {
    const channelUser = await requireChannelUser(twitchId);

    const owned = await prisma.userHero.findUnique({
      where: { channelUserId_heroId: { channelUserId: channelUser.id, heroId } },
    });

    if (!owned) {
      return "not-owned";
    }

    if (owned.isActive) {
      return "already-active";
    }

    // Порядок обязателен: частичный уникальный индекс `UserHero_one_active_per_user` не даст
    // записать второго активного, поэтому старый флаг снимается первым.
    await prisma.$transaction(async (tx) => {
      await tx.userHero.updateMany({
        where: { channelUserId: channelUser.id, isActive: true },
        data: { isActive: false },
      });

      await tx.userHero.update({
        where: { channelUserId_heroId: { channelUserId: channelUser.id, heroId } },
        data: { isActive: true },
      });
    });

    return "equipped";
  }

  public async assignHeroToExistingUsersWithoutOne(): Promise<void> {
    const { channelId } = await resolveChannelContext();

    // Scoped to this channel on purpose: a hero is a property of the pair, so a viewer who
    // has been in this chat but not in another one is a genuine "without a hero" here, and
    // the sweep must not reach across channels to fix it.
    const channelUsersWithoutHero = await prisma.channelUser.findMany({
      where: { channelId, heroes: { none: {} } },
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