import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@twurple/api";
import type { ChatMessage } from "@twurple/chat";
import { config, prisma } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../../__tests__/helpers/test-db";
import { seedTestChannel } from "../../../../__tests__/helpers/seed";
import { UserService } from "../../../user";
import { LotteryService } from "../../../lottery";
import { StreamService } from "../../../stream";
import { HeroService } from "../../../hero";
import { TwitchActivityService } from "../activity.service";
import type { TwitchConfig } from "../../twitch.types";

// The message path is where the role sync actually runs - `trackActivity` is what every chat
// message goes through, before commands and before the XP award. What is under test here is
// the hook itself: the tags off one message reach the balance row, and a role lost by the
// viewer is unflagged by their next message even though `ensureUserExists` short-circuits on
// its `verifiedUsers` cache by then.

const TWITCH_ID = "twitch_111";
const USERNAME = "alice";

const twitchConfig: TwitchConfig = {
  botId: config.twitch.botId,
  userId: config.twitch.userId,
  channelName: config.twitch.channelName,
};

// The follow check is the only ApiClient reach in `trackActivity`. Answering with no follow
// keeps the XP branch deterministic (DEFAULT reward) without touching Twitch.
const makeApi = (): ApiClient =>
  ({
    asUser: vi.fn(async (_twitchId: string, fn: (ctx: unknown) => unknown) =>
      fn({
        channels: {
          getChannelFollowers: async () => ({ data: [] }),
        },
      }),
    ),
  } as unknown as ApiClient);

const makeActivityService = () => {
  const userService = new UserService(
    new LotteryService({
      botId: config.twitch.botId,
      userId: config.twitch.userId,
      channelName: config.twitch.channelName,
    }),
    new StreamService(),
    new HeroService(),
  );

  return {
    activity: new TwitchActivityService(makeApi(), userService, twitchConfig),
    userService,
  };
};

const makeMessage = (roles: {
  isMod: boolean;
  isSubscriber: boolean;
}): ChatMessage =>
  ({
    userInfo: {
      userId: TWITCH_ID,
      displayName: USERNAME,
      isBroadcaster: false,
      isMod: roles.isMod,
      isSubscriber: roles.isSubscriber,
      badges: new Map<string, string[]>(),
    },
  } as unknown as ChatMessage);

describe("TwitchActivityService role sync", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("mirrors the message's roles onto the balance row", async () => {
    const { activity } = makeActivityService();

    await activity.trackActivity(USERNAME, makeMessage({ isMod: true, isSubscriber: true }));

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isMod).toBe(true);
    expect(channelUser.isSubscriber).toBe(true);
  });

  it("unflags a lost role on the next message, past the verified-users cache", async () => {
    const { activity } = makeActivityService();

    await activity.trackActivity(USERNAME, makeMessage({ isMod: true, isSubscriber: true }));
    // The same service instance, so `ensureUserExists` now returns from its cache before
    // touching the database - the case a sync hidden inside it would never reach.
    await activity.trackActivity(USERNAME, makeMessage({ isMod: false, isSubscriber: false }));

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.isMod).toBe(false);
    expect(channelUser.isSubscriber).toBe(false);
  });

  it("still awards the message XP the sync sits in front of", async () => {
    const { activity } = makeActivityService();

    await activity.trackActivity(USERNAME, makeMessage({ isMod: false, isSubscriber: false }));

    const channelUser = await prisma.channelUser.findFirstOrThrow();
    expect(channelUser.xp).toBeGreaterThan(0);
  });

  // The whole reward chain in one pass: the subscriber amount comes from the message tags,
  // the founder and permanent VIP bonuses from the row. 3 + 1 + 1 = 5 for one message.
  it("pays the founder and VIP bonuses to a subscriber's message", async () => {
    const { activity, userService } = makeActivityService();
    await userService.ensureUserExists(TWITCH_ID, USERNAME);
    await userService.setFounder(TWITCH_ID, USERNAME, true);
    await userService.addVipToDb(TWITCH_ID, USERNAME);

    await activity.trackActivity(USERNAME, makeMessage({ isMod: false, isSubscriber: true }));

    expect((await prisma.channelUser.findFirstOrThrow()).xp).toBe(5);
  });
});
