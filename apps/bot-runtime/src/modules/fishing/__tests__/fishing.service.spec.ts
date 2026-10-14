import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, JACKPOT_SEED, prisma } from "@fox-sphere/backend-shared";
import type { FishCatch } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel, TEST_CHANNEL_ID } from "../../../__tests__/helpers/seed";
import { HeroService } from "../../hero";
import { LotteryService } from "../../lottery";
import { StreamService } from "../../stream";
import { UserService } from "../../user";
import { FISHING_CONFIG } from "../fishing.constants";
import { FishingService } from "../fishing.service";

// A catch is drawn at random, and a test that asserts on whichever branch came up asserts on
// nothing. `vi.hoisted` because the mock factory is hoisted above the imports and would
// otherwise touch this binding during module initialisation.
const catchState = vi.hoisted(() => ({
  current: {
    catchType: "coins",
    coinAmount: 25,
    xpAmount: 0,
    bankAmount: 0,
  } as FishCatch,
}));

vi.mock("@fox-sphere/backend-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fox-sphere/backend-shared")>();
  return { ...actual, resolveCatch: () => catchState.current };
});

const TWITCH_ID = "twitch_111";
const USERNAME = "alice";

const makeService = () => {
  const userService = new UserService(
    new LotteryService({
      botId: config.twitch.botId,
      userId: config.twitch.userId,
      channelName: config.twitch.channelName,
    }),
    new StreamService(),
    new HeroService(),
  );

  return new FishingService(userService);
};

const seedViewer = async () => {
  const viewer = await prisma.viewer.create({
    data: { twitchId: TWITCH_ID, username: USERNAME },
  });
  return await prisma.channelUser.create({
    data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id },
  });
};

/** Casts, waits out the bite delay, and pulls. The delay is random, so the wait is its maximum. */
const fishOnce = async (service: FishingService) => {
  expect(
    service.cast({ twitchId: TWITCH_ID, username: USERNAME, channel: "luckyfoxcode" }),
  ).toBe("accepted");
  await vi.advanceTimersByTimeAsync(FISHING_CONFIG.BITE_DELAY_MAX_MS);
  return await service.pull(TWITCH_ID);
};

describe("FishingService grants on ChannelUser", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
    vi.useFakeTimers();
    catchState.current = {
      catchType: "coins",
      coinAmount: 25,
      xpAmount: 0,
      bankAmount: 0,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The regression this release had to fix: `grantCatch` gated the whole reward on a `User` row
  // and returned without a word when it was missing. `User` is frozen, so every viewer whose
  // first message landed after the cutover has no row - and their coins were never awarded.
  it("pays a coin catch to a viewer who has no legacy User row", async () => {
    const channelUser = await seedViewer();
    expect(await prisma.user.count()).toBe(0);

    const result = await fishOnce(makeService());

    expect(result).toMatchObject({ type: "caught" });
    expect((await prisma.channelUser.findUniqueOrThrow({ where: { id: channelUser.id } })).coins).toBe(25);

    const history = await prisma.coinHistory.findMany();
    expect(history).toHaveLength(1);
    // Read off the balance row, never off a second context lookup - the ledger row and the
    // coins it explain have to name the same pair.
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.amount).toBe(25);
    expect(history[0]?.reason).toBe("FISH");
  });

  it("pays an xp catch to a viewer who has no legacy User row", async () => {
    const channelUser = await seedViewer();
    catchState.current = {
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 35,
      bankAmount: 0,
    };

    await fishOnce(makeService());

    expect(
      (await prisma.channelUser.findUniqueOrThrow({ where: { id: channelUser.id } })).xp,
    ).toBe(35);

    const history = await prisma.xpHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.amount).toBe(35);
    expect(await prisma.user.count()).toBe(0);
  });

  // The bank catch writes nobody's ledger - it feeds the shared jackpot - so it must not need
  // a viewer at all.
  it("sends a bank catch to the jackpot and leaves the viewer alone", async () => {
    const channelUser = await seedViewer();
    catchState.current = {
      catchType: "bank",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 200,
    };

    await fishOnce(makeService());

    const state = await prisma.systemState.findUniqueOrThrow({ where: { id: 1 } });
    expect(state.jackpotTotal).toBe(JACKPOT_SEED + 200);
    expect(await prisma.channelUser.findUniqueOrThrow({ where: { id: channelUser.id } })).toMatchObject({
      coins: 0,
      xp: 0,
    });
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  // The other half of the fix. The old guard returned with nothing logged, so a viewer the bot
  // did not know lost the catch in silence; a thrown error names the viewer and the channel.
  it("names the viewer it cannot pay instead of dropping the reward in silence", async () => {
    const service = makeService();
    service.cast({ twitchId: "twitch_ghost", username: "ghost", channel: "luckyfoxcode" });
    await vi.advanceTimersByTimeAsync(FISHING_CONFIG.BITE_DELAY_MAX_MS);

    const error = await service.pull("twitch_ghost").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("twitch_ghost");
    expect((error as Error).message).toContain(TEST_CHANNEL_ID);
  });
});
