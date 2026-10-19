import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, config, prisma } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";
import {
  seedOtherChannel,
  seedTestChannel,
  TEST_CHANNEL_ID,
} from "../../../__tests__/helpers/seed";
import { HeroService } from "../../hero";
import { LotteryService } from "../../lottery";
import { StreamService } from "../../stream";
import { UserService } from "../user.service";
import { XP_REWARDS } from "../user.constants";
import type { ExchangePackage } from "../../twitch/twitch.constants";

// The real `LotteryService`, not a stub. It read the legacy `UserLottery` join until this
// release, and stubbing it is exactly how the mismatch below survived the balance move: a stub
// accepts whatever it is handed, so the one thing worth asserting - that the weekly XP lands on
// the same row the message XP did - was asserted on a `processMessageXp` mock instead.
const makeUserService = () =>
  new UserService(
    new LotteryService({
      botId: config.twitch.botId,
      userId: config.twitch.userId,
      channelName: config.twitch.channelName,
    }),
    new StreamService(),
    new HeroService(),
  );

const TWITCH_ID = "twitch_111";
const USERNAME = "alice";

const exchangePackage: ExchangePackage = {
  rewardTitle: "Test Reward",
  channelPointsCost: 500,
  coinsAwarded: 750,
  bonusPct: 50,
};

describe("UserService on ChannelUser", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("creates the viewer and this channel's balance row on the viewer's first touch", async () => {
    await makeUserService().ensureUserExists(TWITCH_ID, USERNAME);

    const viewer = await prisma.viewer.findUnique({ where: { twitchId: TWITCH_ID } });
    expect(viewer).not.toBeNull();
    expect(viewer?.username).toBe(USERNAME);

    // Both rows, together. `ChannelUser.viewerId` is a foreign key, so a balance row written
    // before its viewer exists is dropped by the constraint on precisely this message - and
    // the failure is silent, since `ensureUserExists` swallows it into a 500.
    const channelUsers = await prisma.channelUser.findMany();
    expect(channelUsers).toHaveLength(1);
    expect(channelUsers[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(channelUsers[0]?.viewerId).toBe(viewer?.id);
  });

  // The direction of the release, stated as an assertion: the bot writes the channel-scoped
  // tables, and `User` is frozen. It fails the moment anything writes the legacy row again.
  it("writes no legacy User row, so the panel and the bot cannot drift apart", async () => {
    await makeUserService().ensureUserExists(TWITCH_ID, USERNAME);
    await makeUserService().addCoins(TWITCH_ID, 250);
    await makeUserService().addXp(TWITCH_ID, 30);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userLottery.count()).toBe(0);
  });

  it("creates nothing new when the same viewer is seen again", async () => {
    const first = makeUserService();
    await first.ensureUserExists(TWITCH_ID, USERNAME);

    const before = await prisma.channelUser.findUniqueOrThrow({
      where: {
        channelId_viewerId: {
          channelId: TEST_CHANNEL_ID,
          viewerId: (
            await prisma.viewer.findUniqueOrThrow({ where: { twitchId: TWITCH_ID } })
          ).id,
        },
      },
    });

    // A fresh service, so its `verifiedUsers` cache is empty and the call really does reach
    // the database - otherwise this would pass against a lookup that never happens.
    await makeUserService().ensureUserExists(TWITCH_ID, USERNAME);

    expect(await prisma.viewer.count()).toBe(1);
    const after = await prisma.channelUser.findMany();
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(before.id);
  });

  it("follows a changed Twitch login onto the viewer, not onto a new row", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await makeUserService().ensureUserExists(TWITCH_ID, "alice_renamed");

    expect(await prisma.viewer.count()).toBe(1);
    expect(await prisma.channelUser.count()).toBe(1);
    expect((await prisma.viewer.findUniqueOrThrow({ where: { twitchId: TWITCH_ID } })).username).toBe(
      "alice_renamed",
    );
  });

  it("moves coins on the channel-scoped row and leaves the viewer row alone", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.addCoins(TWITCH_ID, 250);

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.coins).toBe(250);
    expect(await service.getUserCoins(TWITCH_ID)).toBe(250);
  });

  it("files a coin exchange under the channel and the balance row it changed", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    const result = await service.exchangeChannelPoints(
      TWITCH_ID,
      "redemption-1",
      exchangePackage,
    );

    expect(result).toEqual({ status: "credited", awarded: 750 });

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.coins).toBe(750);

    const history = await prisma.coinHistory.findMany();
    expect(history).toHaveLength(1);
    // The pair the balance was written under, read off the balance row itself. A `User.id`
    // here would satisfy the column and still be another viewer's ledger.
    expect(history[0]?.channelUserId).toBe(channelUser.id);
    expect(history[0]?.channelId).toBe(TEST_CHANNEL_ID);
    expect(history[0]?.amount).toBe(750);
  });

  it("ignores a redemption that has already been credited", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.exchangeChannelPoints(TWITCH_ID, "redemption-1", exchangePackage);
    const second = await service.exchangeChannelPoints(
      TWITCH_ID,
      "redemption-1",
      exchangePackage,
    );

    expect(second).toEqual({ status: "duplicate" });
    expect((await prisma.channelUser.findFirstOrThrow()).coins).toBe(750);
  });

  it("reports an unknown Twitch id rather than crediting nobody", async () => {
    const result = await makeUserService().exchangeChannelPoints(
      "twitch_ghost",
      "redemption-2",
      exchangePackage,
    );

    expect(result).toEqual({ status: "user-not-found" });
    expect(await prisma.coinHistory.count()).toBe(0);
  });

  // Case 5 of the brief: a Twitch id the bot has never seen must fail with something an
  // operator can act on. The naive port - `findChannelUser(...).coins`, or `.viewer.twitchId`
  // on a null - produces `TypeError: Cannot read properties of null`, which names neither the
  // viewer nor the channel.
  it("names the missing viewer instead of dereferencing null", async () => {
    const error = await makeUserService()
      .addCoins("twitch_ghost", 100)
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AppError);
    expect(error).not.toBeInstanceOf(TypeError);
    expect((error as Error).message).toContain("twitch_ghost");
    expect((error as Error).message).toContain(TEST_CHANNEL_ID);
  });

  it("reads one channel's balance, never another's", async () => {
    const otherChannelId = await seedOtherChannel();
    // Created BEFORE this channel's row, deliberately: a lookup that forgot `channelId`
    // would find this one first and answer 9,000 for the wrong channel. Written the other
    // way round the test would pass against the very bug it exists to catch, because
    // `findFirst` has no ordering to break the tie by.
    const viewer = await prisma.viewer.create({
      data: { twitchId: TWITCH_ID, username: USERNAME },
    });
    await prisma.channelUser.create({
      data: { channelId: otherChannelId, viewerId: viewer.id, coins: 9_000 },
    });

    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await service.addCoins(TWITCH_ID, 250);

    expect((await prisma.channelUser.findUniqueOrThrow({
      where: {
        channelId_viewerId: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id },
      },
    })).coins).toBe(250);

    expect(await service.getUserCoins(TWITCH_ID)).toBe(250);
    expect(await service.getUsersStats(TWITCH_ID)).toMatchObject({ coins: 250 });
    expect(await service.getTopUsers()).toEqual([
      { username: USERNAME, lvl: 1, xp: 0 },
    ]);
  });

  it("keeps the two channels' coin caches apart", async () => {
    const otherChannelId = await seedOtherChannel();
    const viewer = await prisma.viewer.create({
      data: { twitchId: TWITCH_ID, username: USERNAME },
    });
    await prisma.channelUser.create({
      data: { channelId: otherChannelId, viewerId: viewer.id, coins: 9_000 },
    });

    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await service.addCoins(TWITCH_ID, 250);
    // Warm this channel's cache.
    expect(await service.getUserCoins(TWITCH_ID)).toBe(250);

    // Same viewer, same cache instance, other channel: still this channel's 250.
    expect(await service.getUserCoins(TWITCH_ID)).toBe(250);
  });

  // The join this release deletes, stated as an assertion: one chat message moves the weekly
  // lottery XP and the message XP on the same balance row. It fails if the lottery is handed an
  // id instead of the row, if it resolves that id against anything, and if either write lands on
  // a different viewer.
  it("files the weekly lottery XP on the same ChannelUser the message XP went to", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.addXpForMessage(TWITCH_ID, 1);

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.xpThisWeek).toBe(XP_REWARDS.LOTTERY);
    expect(channelUser.xp).toBe(1);

    // A second viewer, so "the row that moved" is not merely the only row there is.
    await makeUserService().ensureUserExists("twitch_222", "bob");
    expect(
      (
        await prisma.channelUser.findFirstOrThrow({
          where: { viewer: { twitchId: "twitch_222" } },
        })
      ).xpThisWeek,
    ).toBe(0);

    // No `User` row exists at all in this test, so there is no legacy row that could have
    // absorbed any of it - and the guard the old code needed, which silently skipped the award,
    // has nothing to pass on.
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userLottery.count()).toBe(0);
  });
});

describe("UserService chat role sync", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("mirrors the message's mod and subscriber tags onto the balance row", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.syncChatRoles(TWITCH_ID, { isMod: true, isSubscriber: true });

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isMod).toBe(true);
    expect(channelUser.isSubscriber).toBe(true);
  });

  // 1-1 with the tags: a demoted mod or an unsubscribed viewer is unflagged by their very
  // next message. The alternative - a flag that only ever flips to true - is what makes the
  // column drift away from Twitch and quietly outlive the role it claims to describe.
  it("resets both flags when the next message carries neither", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.syncChatRoles(TWITCH_ID, { isMod: true, isSubscriber: true });
    await service.syncChatRoles(TWITCH_ID, { isMod: false, isSubscriber: false });

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isMod).toBe(false);
    expect(channelUser.isSubscriber).toBe(false);
  });

  // `isFounder` and `isPermanentVip` belong to the manual commands alone. A sync that swept
  // every boolean on the row would hand a chat message the power to revoke both.
  it("leaves isFounder and isPermanentVip to the manual commands alone", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await service.setFounder(TWITCH_ID, USERNAME, true);
    await service.addVipToDb(TWITCH_ID, USERNAME);

    await service.syncChatRoles(TWITCH_ID, {
      isMod: true,
      isSubscriber: false,
    });

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isFounder).toBe(true);
    expect(channelUser.isPermanentVip).toBe(true);
    expect(channelUser.isMod).toBe(true);
    expect(channelUser.isSubscriber).toBe(false);
  });

  // Every message carries the tags, so an unconditional write would put an UPDATE behind
  // each one. The sync has to be a no-op - no `update` call at all - while the row already
  // agrees with the message.
  it("writes nothing when the row already agrees with the message", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await service.syncChatRoles(TWITCH_ID, { isMod: true, isSubscriber: true });

    const updateSpy = vi.spyOn(prisma.channelUser, "update");
    await service.syncChatRoles(TWITCH_ID, { isMod: true, isSubscriber: true });

    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it("does not touch a row that does not exist yet", async () => {
    const service = makeUserService();
    await service.syncChatRoles(TWITCH_ID, { isMod: true, isSubscriber: true });

    expect(await prisma.channelUser.count()).toBe(0);
  });
});

describe("UserService founder flag", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("sets isFounder on the balance row", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);

    await service.setFounder(TWITCH_ID, USERNAME, true);

    expect((await prisma.channelUser.findFirstOrThrow()).isFounder).toBe(true);
  });

  it("clears isFounder again for a mistaken grant", async () => {
    const service = makeUserService();
    await service.ensureUserExists(TWITCH_ID, USERNAME);
    await service.setFounder(TWITCH_ID, USERNAME, true);

    await service.setFounder(TWITCH_ID, USERNAME, false);

    expect((await prisma.channelUser.findFirstOrThrow()).isFounder).toBe(false);
  });

  it("creates the row for a viewer who has never typed, as the VIP command does", async () => {
    await makeUserService().setFounder(TWITCH_ID, USERNAME, true);

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isFounder).toBe(true);
    expect(channelUser.channelId).toBe(TEST_CHANNEL_ID);
    expect(await prisma.viewer.count()).toBe(1);
  });
});