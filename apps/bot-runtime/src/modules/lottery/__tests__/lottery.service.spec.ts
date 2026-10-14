import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config, prisma } from "@fox-sphere/backend-shared";
import type { LotteryUserDto, LotteryWinnersPayload } from "@fox-sphere/types";
import { resetDb } from "../../../__tests__/helpers/test-db";
import {
  seedOtherChannel,
  seedTestChannel,
  TEST_CHANNEL_ID,
} from "../../../__tests__/helpers/seed";
import { globalEventBus } from "../../../shared/services";
import { findChannelUser, requireChannelUser } from "../../channel";
import { LOTTERY_CONFIG } from "../lottery.constants";
import { LotteryService } from "../lottery.service";

// `TwitchConfig` is three strings and the service only compares two of them against a viewer's
// Twitch id, so the real config is the honest input: the broadcaster and the bot guards below
// are only meaningful if they name the accounts `TWITCH_USER_ID` / `TWITCH_BOT_ID` actually do.
const makeService = () =>
  new LotteryService({
    botId: config.twitch.botId,
    userId: config.twitch.userId,
    channelName: config.twitch.channelName,
  });

const seedViewer = async (
  twitchId: string,
  username: string,
  overrides: {
    channelId?: string;
    xpThisWeek?: number;
    hasTicket?: boolean;
    isLuckyVip?: boolean;
    isPermanentVip?: boolean;
  } = {},
) => {
  const viewer = await prisma.viewer.create({ data: { twitchId, username } });
  const channelUser = await prisma.channelUser.create({
    data: {
      channelId: overrides.channelId ?? TEST_CHANNEL_ID,
      viewerId: viewer.id,
      xpThisWeek: overrides.xpThisWeek ?? 0,
      hasTicket: overrides.hasTicket ?? false,
      isLuckyVip: overrides.isLuckyVip ?? false,
      isPermanentVip: overrides.isPermanentVip ?? false,
    },
  });
  return { viewer, channelUser };
};

const idsOf = (users: LotteryUserDto[]): string[] =>
  users.map((u) => u.twitchId).sort();

describe("LotteryService on ChannelUser", () => {
  const ticketEarned: { twitchId: string; username: string }[] = [];
  const winnerDraws: (LotteryWinnersPayload | { oldWinners: LotteryUserDto[] })[] = [];

  // Named rather than inline, because `off` removes by identity: an arrow function written into
  // `beforeEach` is a different object from the one `afterEach` hands back, and the listener
  // survives into the next test - where it would collect a second draw.
  const captureTicket = (data: { twitchId: string; username: string }): void => {
    ticketEarned.push(data);
  };
  const captureWinners = (data: LotteryWinnersPayload): void => {
    winnerDraws.push(data);
  };
  const captureNoParticipants = (data: { oldWinners: LotteryUserDto[] }): void => {
    winnerDraws.push(data);
  };

  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();

    ticketEarned.length = 0;
    winnerDraws.length = 0;
    globalEventBus.on("lottery:ticket-earned", captureTicket);
    globalEventBus.on("lottery:winners", captureWinners);
    globalEventBus.on("lottery:no-participants", captureNoParticipants);
  });

  afterEach(() => {
    // Scoped to the three events this file listens to. `removeAllListeners()` would also drop
    // the forwarders' own, and those are registered by the worker's bootstrap, not by an import.
    globalEventBus.off("lottery:ticket-earned", captureTicket);
    globalEventBus.off("lottery:winners", captureWinners);
    globalEventBus.off("lottery:no-participants", captureNoParticipants);
  });

  // The three columns `UserLottery` used to hold, read as columns on the balance row. The
  // `User` assertion is the direction of the release stated as a test: it fails the moment
  // anything reaches for the legacy join again.
  it("adds weekly XP to the ChannelUser and to nothing else", async () => {
    const { channelUser } = await seedViewer("twitch_111", "alice");

    await makeService().processMessageXp(
      await requireChannelUser("twitch_111"),
      7,
    );

    const after = await prisma.channelUser.findUniqueOrThrow({
      where: { id: channelUser.id },
    });
    expect(after.xpThisWeek).toBe(7);
    expect(after.hasTicket).toBe(false);
    expect(await prisma.userLottery.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });

  it("hands out the ticket once the threshold is passed, and only once", async () => {
    await seedViewer("twitch_111", "alice", {
      xpThisWeek: LOTTERY_CONFIG.TICKET_XP_THRESHOLD - 1,
    });

    const service = makeService();
    await service.processMessageXp(await requireChannelUser("twitch_111"));

    const after = await prisma.channelUser.findFirstOrThrow();
    expect(after.hasTicket).toBe(true);
    expect(ticketEarned).toEqual([{ twitchId: "twitch_111", username: "alice" }]);

    // The `hasTicket` guard, not the threshold: a viewer over the threshold on their next
    // message must not announce a second ticket they never earned.
    await service.processMessageXp(await requireChannelUser("twitch_111"));
    expect(ticketEarned).toHaveLength(1);
  });

  // The identity in the event comes from `Viewer`, which is the whole reason `processMessageXp`
  // takes a row instead of an id - there is no longer a `User` row to read the name off.
  it("names the Viewer, not the balance row, in the ticket event", async () => {
    await seedViewer("twitch_111", "alice_renamed", {
      xpThisWeek: LOTTERY_CONFIG.TICKET_XP_THRESHOLD,
    });

    await makeService().processMessageXp(await requireChannelUser("twitch_111"));

    expect(ticketEarned[0]?.username).toBe("alice_renamed");
  });

  it.each([
    ["the broadcaster", config.twitch.userId],
    ["the bot", config.twitch.botId],
  ])("gives %s no weekly lottery XP", async (_label, twitchId) => {
    await seedViewer(twitchId, "privileged");

    await makeService().processMessageXp(await requireChannelUser(twitchId));

    expect((await prisma.channelUser.findFirstOrThrow()).xpThisWeek).toBe(0);
  });

  it("gives a permanent VIP no weekly lottery XP", async () => {
    await seedViewer("twitch_111", "alice", { isPermanentVip: true });

    await makeService().processMessageXp(await requireChannelUser("twitch_111"));

    expect((await prisma.channelUser.findFirstOrThrow()).xpThisWeek).toBe(0);
  });

  it("draws from this channel's ticket holders and clears the week", async () => {
    const { viewer } = await seedViewer("twitch_111", "alice", {
      hasTicket: true,
      xpThisWeek: 100,
    });
    await seedViewer("twitch_222", "bob", { hasTicket: true, xpThisWeek: 100 });
    // Last week's winner, without a ticket: exactly the case the two `updateMany` calls split.
    await seedViewer("twitch_333", "carol", { isLuckyVip: true, xpThisWeek: 40 });

    // The same person as alice in a second channel. `Viewer.twitchId` is globally unique, so a
    // viewer is one row and a balance is one row per channel - which is the whole reason the
    // reset below has to name a channel.
    const otherChannelId = await seedOtherChannel();
    await prisma.channelUser.create({
      data: {
        channelId: otherChannelId,
        viewerId: viewer.id,
        hasTicket: true,
        xpThisWeek: 100,
        isLuckyVip: true,
      },
    });

    expect(await makeService().runWeeklyLottery()).toBe(true);

    const rows = await prisma.channelUser.findMany({
      include: { viewer: true },
    });
    const byTwitchId = new Map(rows.map((r) => [r.viewer.twitchId, r]));
    const thisChannel = (twitchId: string) =>
      rows.find(
        (r) => r.channelId === TEST_CHANNEL_ID && r.viewer.twitchId === twitchId,
      );

    // Fewer participants than `WINNERS_COUNT`, so every one of them wins - the draw's order is
    // random and a test that asserted an order would be asserting `shuffleArray`.
    expect(thisChannel("twitch_111")?.isLuckyVip).toBe(true);
    expect(thisChannel("twitch_222")?.isLuckyVip).toBe(true);
    expect(thisChannel("twitch_333")?.isLuckyVip).toBe(false);

    for (const twitchId of ["twitch_111", "twitch_222", "twitch_333"]) {
      expect(thisChannel(twitchId)?.hasTicket).toBe(false);
      expect(thisChannel(twitchId)?.xpThisWeek).toBe(0);
    }

    // The reset had no `where` clause before this release, so one channel's draw wiped every
    // channel's week - including the same viewer's own other balance.
    const other = rows.find((r) => r.channelId === otherChannelId);
    expect(other?.hasTicket).toBe(true);
    expect(other?.xpThisWeek).toBe(100);
    expect(other?.isLuckyVip).toBe(true);

    expect(winnerDraws).toHaveLength(1);
    const draw = winnerDraws[0] as LotteryWinnersPayload;
    expect(idsOf(draw.newWinners)).toEqual(["twitch_111", "twitch_222"]);
    expect(idsOf(draw.participants)).toEqual(["twitch_111", "twitch_222"]);
    // Carol, and only carol: alice's other-channel `isLuckyVip` is not this channel's business,
    // which is what scoping the read by `channelId` buys.
    expect(idsOf(draw.oldWinners)).toEqual(["twitch_333"]);
    expect(draw.newWinners.map((u) => u.username).sort()).toEqual(["alice", "bob"]);

    expect(byTwitchId.size).toBe(3);
  });

  it("does not draw a permanent VIP who somehow holds a ticket", async () => {
    await seedViewer("twitch_111", "alice", { hasTicket: true, isPermanentVip: true });

    expect(await makeService().runWeeklyLottery()).toBe(false);

    const after = await prisma.channelUser.findFirstOrThrow();
    expect(after.isLuckyVip).toBe(false);
    expect(after.hasTicket).toBe(false);
  });

  // The other branch of the same method, and the one a viewer sees on a quiet week: it still
  // has to clear last week's winners, or `isLuckyVip` would compound week after week.
  it("clears last week's winners and reports the postponement when nobody holds a ticket", async () => {
    await seedViewer("twitch_111", "alice", { isLuckyVip: true, xpThisWeek: 30 });

    expect(await makeService().runWeeklyLottery()).toBe(false);

    const after = await prisma.channelUser.findFirstOrThrow();
    expect(after.isLuckyVip).toBe(false);
    expect(after.xpThisWeek).toBe(0);

    expect(winnerDraws).toEqual([{ oldWinners: [{ twitchId: "twitch_111", username: "alice" }] }]);
  });

  it("leaves no legacy row behind, whatever the draw did", async () => {
    await seedViewer("twitch_111", "alice", { hasTicket: true });
    await makeService().runWeeklyLottery();

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userLottery.count()).toBe(0);
    expect(await findChannelUser("twitch_111")).not.toBeNull();
  });
});
