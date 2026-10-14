import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, prisma } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel, TEST_CHANNEL_ID } from "../../../__tests__/helpers/seed";
import { ROULETTE_CONFIG } from "../roulette.constants";
import { RouletteService } from "../roulette.service";
import type { UserService } from "../../user";

// A spin pays out one of three things at random, and it holds the queue for five seconds so the
// wheel finishes turning before the next spinner starts. Neither is what this file is about, so
// both are pinned: the prize to the dull `xp` branch, the animation to nothing.
vi.mock("@fox-sphere/backend-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fox-sphere/backend-shared")>();
  return { ...actual, resolveSpinPrize: () => ({ prizeType: "xp", xpAmount: 5 }) };
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
    expect(updated.totalLoss).toBe(ROULETTE_CONFIG.PRICE);

    const history = await prisma.coinHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]?.reason).toBe("SPIN");
    expect(history[0]?.amount).toBe(-ROULETTE_CONFIG.PRICE);
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(await prisma.user.count()).toBe(0);
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