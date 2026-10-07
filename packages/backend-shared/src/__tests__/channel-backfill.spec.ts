import { describe, expect, it } from "vitest";
import {
  buildChannelUserRows,
  buildViewerRows,
  type LegacyUser,
  type LegacyUserLottery,
} from "../backfill";

const LAST_XP_AT = new Date("2026-03-04T05:06:07.000Z");

const makeUser = (overrides: Partial<LegacyUser> = {}): LegacyUser => ({
  twitchId: "twitch-alpha",
  username: "alpha_name",
  coins: 101,
  lvl: 7,
  xp: 2043,
  lastXpAt: LAST_XP_AT,
  isMod: true,
  isFounder: true,
  isSubscriber: true,
  isPermanentVip: true,
  spinsCount: 55,
  totalWin: 6789,
  totalLoss: 4321,
  ...overrides,
});

const makeLottery = (overrides: Partial<LegacyUserLottery> = {}): LegacyUserLottery => ({
  twitchId: "twitch-alpha",
  xpThisWeek: 321,
  hasTicket: true,
  isLuckyVip: true,
  ...overrides,
});

const viewerIdsFor = (...twitchIds: string[]): ReadonlyMap<string, string> =>
  new Map(twitchIds.map((twitchId) => [twitchId, `viewer-for-${twitchId}`]));

describe("buildViewerRows", () => {
  it("maps twitchId and username for every user", () => {
    const users = [
      makeUser(),
      makeUser({ twitchId: "twitch-beta", username: "beta_name" }),
    ];

    expect(buildViewerRows(users)).toEqual([
      { twitchId: "twitch-alpha", username: "alpha_name" },
      { twitchId: "twitch-beta", username: "beta_name" },
    ]);
  });
});

describe("buildChannelUserRows", () => {
  it("copies all eleven balance and flag fields from User verbatim", () => {
    const user = makeUser();

    const rows = buildChannelUserRows(
      [user],
      [makeLottery()],
      "channel-one",
      viewerIdsFor(user.twitchId),
    );

    expect(rows).toEqual([
      {
        channelId: "channel-one",
        viewerId: "viewer-for-twitch-alpha",
        coins: 101,
        lvl: 7,
        xp: 2043,
        lastXpAt: LAST_XP_AT,
        isMod: true,
        isFounder: true,
        isSubscriber: true,
        isPermanentVip: true,
        spinsCount: 55,
        totalWin: 6789,
        totalLoss: 4321,
        xpThisWeek: 321,
        hasTicket: true,
        isLuckyVip: true,
      },
    ]);
  });

  it("takes the three lottery fields from the matching UserLottery row", () => {
    const alpha = makeUser();
    const beta = makeUser({
      twitchId: "twitch-beta",
      username: "beta_name",
      coins: 202,
      xp: 4096,
      isMod: false,
      isFounder: false,
    });
    const lotteries = [
      makeLottery(),
      makeLottery({
        twitchId: "twitch-beta",
        xpThisWeek: 999,
        hasTicket: false,
        isLuckyVip: false,
      }),
    ];

    const rows = buildChannelUserRows(
      [alpha, beta],
      lotteries,
      "channel-one",
      viewerIdsFor("twitch-alpha", "twitch-beta"),
    );

    expect(
      rows.map((row) => ({
        viewerId: row.viewerId,
        coins: row.coins,
        xp: row.xp,
        isMod: row.isMod,
        isFounder: row.isFounder,
        xpThisWeek: row.xpThisWeek,
        hasTicket: row.hasTicket,
        isLuckyVip: row.isLuckyVip,
      })),
    ).toEqual([
      {
        viewerId: "viewer-for-twitch-alpha",
        coins: 101,
        xp: 2043,
        isMod: true,
        isFounder: true,
        xpThisWeek: 321,
        hasTicket: true,
        isLuckyVip: true,
      },
      {
        viewerId: "viewer-for-twitch-beta",
        coins: 202,
        xp: 4096,
        isMod: false,
        isFounder: false,
        xpThisWeek: 999,
        hasTicket: false,
        isLuckyVip: false,
      },
    ]);
  });

  it("falls back to defaults when a user has no lottery row", () => {
    const user = makeUser();

    const [row] = buildChannelUserRows(
      [user],
      [],
      "channel-one",
      viewerIdsFor(user.twitchId),
    );

    expect({
      xpThisWeek: row.xpThisWeek,
      hasTicket: row.hasTicket,
      isLuckyVip: row.isLuckyVip,
    }).toEqual({ xpThisWeek: 0, hasTicket: false, isLuckyVip: false });
  });

  it("throws naming the twitchId when the viewer map has no entry", () => {
    const known = makeUser();
    const unknown = makeUser({ twitchId: "that-twitch-id", username: "no_viewer_yet" });

    expect(() =>
      buildChannelUserRows(
        [known, unknown],
        [],
        "channel-one",
        viewerIdsFor(known.twitchId),
      ),
    ).toThrow(/that-twitch-id/);
  });

  it("stamps every row with the given channelId", () => {
    const users = [
      makeUser(),
      makeUser({ twitchId: "twitch-beta", username: "beta_name" }),
    ];

    const rows = buildChannelUserRows(
      users,
      [],
      "channel-nine",
      viewerIdsFor("twitch-alpha", "twitch-beta"),
    );

    expect(rows.map((row) => row.channelId)).toEqual(["channel-nine", "channel-nine"]);
  });
});
