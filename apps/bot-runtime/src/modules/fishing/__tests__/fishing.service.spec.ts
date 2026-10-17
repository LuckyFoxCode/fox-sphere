import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, JACKPOT_SEED, Logger, prisma } from "@fox-sphere/backend-shared";
import type { FishCatch } from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../../shared/services";
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

/**
 * `vi.useFakeTimers()` replaces the global `setTimeout`, but a reference captured before it was
 * installed still schedules on the real clock. That is the only way to let the bite callback's
 * promise chain finish: it awaits Prisma round-trips, and `advanceTimersByTimeAsync` returns as
 * soon as the timer callback is entered, not when its awaits resolve.
 */
const realSetTimeout = globalThis.setTimeout;

/** Waits until `done` holds, giving the real clock at most ~200ms to get there. */
const settle = async (done: () => boolean): Promise<void> => {
  for (let i = 0; i < 200 && !done(); i += 1) {
    await new Promise((resolve) => realSetTimeout(resolve, 1));
  }
};

/**
 * Casts and waits out the bite delay. The delay is random, so the wait is its maximum.
 *
 * There is no pull step: the bot resolves the catch itself when the bite lands, so advancing past
 * the bite is the whole round. The result is read off the event the chat listener consumes rather
 * than off a return value, which is the interface that actually exists now.
 */
const fishOnce = async (service: FishingService) => {
  const seen: FishCatch[] = [];
  const onBite = (data: { catch: FishCatch }) => seen.push(data.catch);
  globalEventBus.on("fish:bite", onBite);

  try {
    expect(
      service.cast({ twitchId: TWITCH_ID, username: USERNAME, channel: "luckyfoxcode" }),
    ).toBe("accepted");
    await vi.advanceTimersByTimeAsync(FISHING_CONFIG.BITE_DELAY_MAX_MS);
    await settle(() => seen.length > 0);
  } finally {
    globalEventBus.off("fish:bite", onBite);
  }

  expect(seen).toHaveLength(1);
  return seen[0] as FishCatch;
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
    vi.restoreAllMocks();
  });

  // The regression this release had to fix: `grantCatch` gated the whole reward on a `User` row
  // and returned without a word when it was missing. `User` is frozen, so every viewer whose
  // first message landed after the cutover has no row - and their coins were never awarded.
  it("pays a coin catch to a viewer who has no legacy User row", async () => {
    const channelUser = await seedViewer();
    expect(await prisma.user.count()).toBe(0);

    await fishOnce(makeService());

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
      xpAmount: 20,
      bankAmount: 0,
    };

    await fishOnce(makeService());

    expect(
      (await prisma.channelUser.findUniqueOrThrow({ where: { id: channelUser.id } })).xp,
    ).toBe(20);

    const history = await prisma.xpHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.amount).toBe(20);
    expect(await prisma.user.count()).toBe(0);
  });

  // The whole reason the pull step is gone. The catch resolves itself at the bite, so there is no
  // window in which a viewer who looked away loses the round - and a dud is announced as one
  // rather than leaving the balance untouched in silence.
  it("announces a dud on the bite and writes nothing", async () => {
    const channelUser = await seedViewer();
    catchState.current = {
      catchType: "empty",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 0,
    };

    const caught = await fishOnce(makeService());

    expect(caught.catchType).toBe("empty");
    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(updated.coins).toBe(0);
    expect(updated.xp).toBe(0);
    expect(await prisma.coinHistory.count()).toBe(0);
    expect(await prisma.xpHistory.count()).toBe(0);
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
  // did not know lost the catch in silence; a named error is what keeps it from being silent.
  //
  // It cannot be a throw any more: the reward is granted from a timer callback that nobody awaits,
  // so an unhandled rejection is the only thing a rejection would produce. The bite handler
  // catches and logs it instead, which is where the viewer and the channel have to be named.
  it("names the viewer it cannot pay instead of dropping the reward in silence", async () => {
    const errorSpy = vi.spyOn(Logger, "error").mockImplementation(() => {});
    const service = makeService();
    service.cast({ twitchId: "twitch_ghost", username: "ghost", channel: "luckyfoxcode" });

    await vi.advanceTimersByTimeAsync(FISHING_CONFIG.BITE_DELAY_MAX_MS);
    await settle(() => errorSpy.mock.calls.length > 0);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [, message, error] = errorSpy.mock.calls[0] ?? [];
    expect(message).toContain("ghost");
    expect(String(error)).toContain("twitch_ghost");
    expect(String(error)).toContain(TEST_CHANNEL_ID);
    expect(await prisma.coinHistory.count()).toBe(0);
  });
});
