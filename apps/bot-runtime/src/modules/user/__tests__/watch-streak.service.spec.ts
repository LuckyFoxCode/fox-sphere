import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel, TEST_CHANNEL_ID } from "../../../__tests__/helpers/seed";
import { UserService } from "../user.service";
import { WatchStreakService } from "../watch-streak.service";
import type { LotteryService } from "../../lottery";
import { HeroService } from "../../hero";
import { StreamService } from "../../stream";

const TWITCH_ID = "twitch_111";
const USERNAME = "alice";
const STREAK = 3;

// Only `ensureUserExists` is reached from here, and the collaborators it does not use are the
// reason the fakes are allowed to be empty: what matters is that it writes the channel-scoped
// pair, not what the stream total or a hero would have done.
const lotteryService = {} as unknown as LotteryService;

const makeUserService = () =>
  new UserService(lotteryService, new StreamService(), new HeroService());

const seedViewer = async (): Promise<{ id: number }> => {
  await makeUserService().ensureUserExists(TWITCH_ID, USERNAME);
  return await prisma.channelUser.findFirstOrThrow();
};

describe("WatchStreakService on ChannelUser", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  // Case 3 of the brief. `XpHistory.channelUserId` is a foreign key and a plain integer, so a
  // `User.id` dropped into it satisfies the type and files the streak under another viewer's
  // ledger — and nothing anywhere reports it. The two assertions that catch it are the value
  // matching the balance row and the absence of any `User` row for it to have been taken from.
  it("moves xp and coins and files both histories under the balance row", async () => {
    const channelUser = await seedViewer();

    const award = await new WatchStreakService().award(TWITCH_ID, STREAK);

    expect(award).toEqual({ xpAwarded: 21, coinsAwarded: 300, isRepeat: false });

    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(updated.xp).toBe(21);
    expect(updated.coins).toBe(300);

    const xpHistory = await prisma.xpHistory.findMany();
    expect(xpHistory).toHaveLength(1);
    expect(xpHistory[0]?.channelUserId).toBe(channelUser.id);
    expect(xpHistory[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(xpHistory[0]?.amount).toBe(21);
    expect(xpHistory[0]?.reason).toBe("WATCH_STREAK");

    const coinHistory = await prisma.coinHistory.findMany();
    expect(coinHistory).toHaveLength(1);
    expect(coinHistory[0]?.channelUserId).toBe(channelUser.id);
    expect(coinHistory[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(coinHistory[0]?.amount).toBe(300);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.watchStreak.count()).toBe(1);
  });

  it("awards half on a repeat and files the half, not the full amount", async () => {
    const channelUser = await seedViewer();
    const service = new WatchStreakService();

    await service.award(TWITCH_ID, STREAK);
    const repeat = await service.award(TWITCH_ID, STREAK);

    expect(repeat).toEqual({ xpAwarded: 10, coinsAwarded: 150, isRepeat: true });

    const updated = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(updated.xp).toBe(21 + 10);
    expect(updated.coins).toBe(300 + 150);

    const xpHistory = await prisma.xpHistory.findMany();
    expect(xpHistory).toHaveLength(2);
    expect(xpHistory.every((row) => row.channelUserId === channelUser.id)).toBe(true);
  });

  it("ignores a streak level that earns nothing", async () => {
    await seedViewer();

    expect(await new WatchStreakService().award(TWITCH_ID, 4)).toBeNull();
    expect(await prisma.xpHistory.count()).toBe(0);
    expect(await prisma.watchStreak.count()).toBe(0);
  });

  it("awards nothing to a Twitch id this channel has never seen", async () => {
    expect(await new WatchStreakService().award("twitch_ghost", STREAK)).toBeNull();
    expect(await prisma.xpHistory.count()).toBe(0);
  });

  it("keeps the repeat record per channel user, so a second streak is not a repeat", async () => {
    await seedViewer();
    const service = new WatchStreakService();

    await service.award(TWITCH_ID, STREAK);
    const next = await service.award(TWITCH_ID, 5);

    expect(next).toEqual({ xpAwarded: 35, coinsAwarded: 500, isRepeat: false });
  });
});