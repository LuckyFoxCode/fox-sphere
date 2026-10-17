import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, prisma, type RoulettePrize } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel, TEST_CHANNEL_ID } from "../../../__tests__/helpers/seed";
import { ROULETTE_CONFIG } from "../roulette.constants";
import { RouletteService } from "../roulette.service";
import type { UserService } from "../../user";

// A spin pays out one of three things at random, and it holds the queue for five seconds so the
// wheel finishes turning before the next spinner starts. Neither is what this file is about, so
// both are pinned: the prize to the dull `xp` branch, the animation to nothing.
//
// The prize is a mutable holder rather than a constant because "the loss is max(0, stake - prize)"
// is indistinguishable from "the loss is the stake" while every spin pays XP and `totalWin`
// therefore stays 0. A test that names a prize above the stake is what separates the two, and it
// can only do that by choosing the prize itself. `coinAmount` is spelled out even on the XP prize:
// the real `resolveSpinPrize` always returns the field, and an omitted one reads as `undefined`
// arithmetic rather than as zero coins.
let spinPrize: RoulettePrize = { prizeType: "xp", coinAmount: 0, xpAmount: 5 };

vi.mock("@fox-sphere/backend-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fox-sphere/backend-shared")>();
  return { ...actual, resolveSpinPrize: () => spinPrize };
});

vi.mock("@fox-sphere/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fox-sphere/types")>();
  return { ...actual, ROULETTE_SPIN_ANIMATION_MS: 0 };
});

const TWITCH_ID = "twitch_111";

const makeService = () =>
  new RouletteService({
    invalidateCoins: vi.fn(async () => {}),
    addXp: vi.fn(async () => {}),
  } as unknown as UserService);

const seedViewer = async (coins: number) => {
  const viewer = await prisma.viewer.create({
    data: { twitchId: TWITCH_ID, username: "alice" },
  });
  const channelUser = await prisma.channelUser.create({
    data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id, coins },
  });
  return channelUser;
};

describe("RouletteService on ChannelUser", () => {
  beforeEach(async () => {
    spinPrize = { prizeType: "xp", coinAmount: 0, xpAmount: 5 };
    await resetDb();
    await seedTestChannel();
  });

  it("debits the balance row and files the cost against it", async () => {
    const channelUser = await seedViewer(1_000);

    await makeService().spinUser({ twitchId: TWITCH_ID, username: "alice" });

    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(updated.coins).toBe(1_000 - ROULETTE_CONFIG.PRICE);
    expect(updated.spinsCount).toBe(1);
    // totalLoss — реальный проигрыш, а не оборот ставок. Инвариант на одном спине:
    // проигрыш = max(0, ставка − приз), а totalWin и есть приз.
    expect(updated.totalLoss).toBe(Math.max(0, ROULETTE_CONFIG.PRICE - updated.totalWin));
    expect(updated.totalLoss).toBeLessThanOrEqual(ROULETTE_CONFIG.PRICE);
    // Приз >= ставки обязан дать нулевой проигрыш, а не отрицательный.
    expect(updated.totalLoss).toBeGreaterThanOrEqual(0);

    const history = await prisma.coinHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]?.reason).toBe("SPIN");
    expect(history[0]?.amount).toBe(-ROULETTE_CONFIG.PRICE);
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(await prisma.user.count()).toBe(0);
  });

  it("books no loss on a spin whose prize covers the stake", async () => {
    spinPrize = { prizeType: "coins", coinAmount: 250, xpAmount: 0 };
    const channelUser = await seedViewer(1_000);

    await makeService().spinUser({ twitchId: TWITCH_ID, username: "alice" });

    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(updated.totalWin).toBe(250);
    expect(updated.totalLoss).toBe(0);
    expect(updated.totalLoss).toBe(Math.max(0, ROULETTE_CONFIG.PRICE - updated.totalWin));
  });

  it("books no loss on a jackpot spin, whose payout is the whole bank", async () => {
    spinPrize = { prizeType: "jackpot", coinAmount: 0, xpAmount: 0 };
    const channelUser = await seedViewer(1_000);

    await makeService().spinUser({ twitchId: TWITCH_ID, username: "alice" });

    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    // prize.coinAmount у джекпота равен 0, а выплата — весь банк (не меньше JACKPOT_SEED = 1000).
    // Считать проигрыш от нуля значило бы записать 100 монет потерь на спине, выплатившем больше
    // тысячи, — и инвариант выше на таком спине был бы нарушен.
    expect(updated.totalWin).toBeGreaterThan(ROULETTE_CONFIG.PRICE);
    expect(updated.totalLoss).toBe(0);
    expect(updated.totalLoss).toBe(Math.max(0, ROULETTE_CONFIG.PRICE - updated.totalWin));
  });

  it("rolls the whole spin back when the balance is short", async () => {
    await seedViewer(ROULETTE_CONFIG.PRICE - 1);

    await expect(
      makeService().spinUser({ twitchId: TWITCH_ID, username: "alice" }),
    ).rejects.toThrow("Insufficient coins at transaction time");

    const updated = await prisma.channelUser.findFirstOrThrow();
    expect(updated.coins).toBe(ROULETTE_CONFIG.PRICE - 1);
    expect(updated.spinsCount).toBe(0);
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  // The spin used to `findUniqueOrThrow` on `User`; the port resolves the `(channel, viewer)`
  // pair instead, and the question this pins is what a spin for somebody the bot has never seen
  // says. A bare `TypeError` names neither the Twitch id nor the channel it looked in.
  it("names the missing viewer instead of dereferencing null", async () => {
    const error = await makeService()
      .spinUser({ twitchId: "twitch_ghost", username: "ghost" })
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AppError);
    expect(error).not.toBeInstanceOf(TypeError);
    expect((error as Error).message).toContain("twitch_ghost");
    expect((error as Error).message).toContain(TEST_CHANNEL_ID);
  });

  it("keeps serving the next spinner after one fails", async () => {
    const channelUser = await seedViewer(1_000);
    const service = makeService();

    await expect(
      service.spinUser({ twitchId: "twitch_ghost", username: "ghost" }),
    ).rejects.toThrow(AppError);

    const result = await service.spinUser({ twitchId: TWITCH_ID, username: "alice" });

    expect(result.prizeType).toBe("xp");
    expect(
      (await prisma.channelUser.findUniqueOrThrow({ where: { id: channelUser.id } })).coins,
    ).toBe(1_000 - ROULETTE_CONFIG.PRICE);
  });
});