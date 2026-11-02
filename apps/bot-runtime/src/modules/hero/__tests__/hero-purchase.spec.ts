import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@fox-sphere/backend-shared";
import { getHeroById } from "@fox-sphere/types";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel, TEST_CHANNEL_ID } from "../../../__tests__/helpers/seed";
import { HeroService } from "../hero.service";

const TWITCH_ID = "twitch_111";

const seedChannelUser = async (coins = 0) => {
  const viewer = await prisma.viewer.create({
    data: { twitchId: TWITCH_ID, username: "alice" },
  });

  return prisma.channelUser.create({
    data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id, coins },
  });
};

const ROBBIE = getHeroById("robber"); // цена 300

describe("HeroService.buyHero", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("debits the price, records ownership as inactive and files the coin history", async () => {
    const channelUser = await seedChannelUser(500);

    const result = await new HeroService().buyHero(TWITCH_ID, ROBBIE);

    expect(result).toEqual({ status: "bought", coinsAfter: 200 });

    const row = await prisma.userHero.findFirstOrThrow();
    expect(row.channelUserId).toBe(channelUser.id);
    expect(row.channelId).toBe(TEST_CHANNEL_ID);
    expect(row.heroId).toBe("robber");
    // Покупка не надевает героя - это работа `!use`.
    expect(row.isActive).toBe(false);

    const history = await prisma.coinHistory.findFirstOrThrow();
    // Both halves of the pair, the same way `fishing.service.spec.ts` pins them:
    // `CoinHistory.channelId` is a plain column with no foreign key, so nothing in the schema
    // stops it drifting from the balance row it explains - and `User.id` / `ChannelUser.id` are
    // unrelated sequences, so a history write handed the wrong id files it under another viewer.
    expect(history.channelId).toBe(TEST_CHANNEL_ID);
    expect(history.channelUserId).toBe(channelUser.id);
    expect(history.amount).toBe(-300);
    expect(history.reason).toBe("HERO_PURCHASE");
    expect(history.details).toBe("Hero: robber");
  });

  it("buys when the balance is exactly the price", async () => {
    await seedChannelUser(300);

    expect(await new HeroService().buyHero(TWITCH_ID, ROBBIE)).toEqual({
      status: "bought",
      coinsAfter: 0,
    });
  });

  it("refuses one coin short and writes nothing", async () => {
    await seedChannelUser(299);

    expect(await new HeroService().buyHero(TWITCH_ID, ROBBIE)).toEqual({
      status: "insufficient-funds",
      coins: 299,
      shortfall: 1,
    });
    expect((await prisma.channelUser.findFirstOrThrow()).coins).toBe(299);
    expect(await prisma.userHero.count()).toBe(0);
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  it("refuses a second purchase without charging again", async () => {
    await seedChannelUser(1000);
    const service = new HeroService();
    await service.buyHero(TWITCH_ID, ROBBIE);

    expect(await service.buyHero(TWITCH_ID, ROBBIE)).toEqual({ status: "already-owned" });
    expect((await prisma.channelUser.findFirstOrThrow()).coins).toBe(700);
    expect(await prisma.userHero.count()).toBe(1);
    expect(await prisma.coinHistory.count()).toBe(1);
  });

  it("answers already-owned before looking at the price", async () => {
    // Баланс 0 против цены 300 - единственный случай, где порядок проверок виден снаружи:
    // при проверке денег первой ответ был бы `insufficient-funds`. Тест на 1000 монетах
    // этого не различает, потому что P2002 откатывает транзакцию и даёт тот же ответ.
    const channelUser = await seedChannelUser(0);
    await prisma.userHero.create({
      data: {
        channelUserId: channelUser.id,
        channelId: TEST_CHANNEL_ID,
        heroId: ROBBIE.id,
      },
    });

    expect(await new HeroService().buyHero(TWITCH_ID, ROBBIE)).toEqual({
      status: "already-owned",
    });
    expect((await prisma.channelUser.findFirstOrThrow()).coins).toBe(0);
    expect(await prisma.userHero.count()).toBe(1);
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  it("grants a zero-price hero without a debit or a ledger row", async () => {
    await seedChannelUser(50);

    expect(await new HeroService().buyHero(TWITCH_ID, getHeroById("assassin"))).toEqual({
      status: "bought",
      coinsAfter: 50,
    });
    expect(await prisma.userHero.count()).toBe(1);
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  it("refuses a viewer with no balance row", async () => {
    await expect(new HeroService().buyHero("nobody", ROBBIE)).rejects.toThrow();
  });
});
