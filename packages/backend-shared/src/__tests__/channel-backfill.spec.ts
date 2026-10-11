import { describe, expect, it } from "vitest";
import {
  buildChannelUserRows,
  buildViewerRows,
  channelUserKey,
  type LegacyUser,
  type LegacyUserLottery,
  parseBackfillArgs,
  selectMissingRows,
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

describe("channelUserKey", () => {
  it("joins the channel and viewer ids into one string", () => {
    expect(channelUserKey("channel-one", "viewer-42")).toBe("channel-one:viewer-42");
  });
});

describe("selectMissingRows", () => {
  const rowsForChannel = (channelId: string, ...twitchIds: string[]) =>
    buildChannelUserRows(
      twitchIds.map((twitchId) => makeUser({ twitchId })),
      [],
      channelId,
      viewerIdsFor(...twitchIds),
    );

  const rowsFor = (...twitchIds: string[]) => rowsForChannel("channel-one", ...twitchIds);

  it("keeps nothing when every key is already present", () => {
    const rows = rowsFor("twitch-alpha");

    expect(selectMissingRows(rows, new Set(["channel-one:viewer-for-twitch-alpha"]))).toEqual([]);
  });

  it("keeps every row when nothing exists yet", () => {
    const rows = rowsFor("twitch-alpha", "twitch-beta");

    expect(selectMissingRows(rows, new Set())).toEqual(rows);
  });

  it("keeps only the rows whose key is absent, in the order given", () => {
    const rows = rowsFor("twitch-alpha", "twitch-beta", "twitch-gamma");

    const missing = selectMissingRows(rows, new Set(["channel-one:viewer-for-twitch-beta"]));

    expect(missing.map((row) => row.viewerId)).toEqual([
      "viewer-for-twitch-alpha",
      "viewer-for-twitch-gamma",
    ]);
  });

  it("does not confuse a key that is a substring of another", () => {
    const rows = rowsFor("twitch-al");

    expect(selectMissingRows(rows, new Set(["channel-one:viewer-for-twitch-alpha"]))).toEqual(rows);
  });

  it("keys on the channel too, so one channel never suppresses another's rows", () => {
    const rows = [...rowsFor("twitch-alpha"), ...rowsForChannel("channel-two", "twitch-alpha")];

    const missing = selectMissingRows(rows, new Set(["channel-one:viewer-for-twitch-alpha"]));

    expect(missing.map((row) => `${row.channelId}:${row.viewerId}`)).toEqual([
      "channel-two:viewer-for-twitch-alpha",
    ]);
  });
});

describe("parseBackfillArgs", () => {
  it("returns no login and sync false for no arguments", () => {
    expect(parseBackfillArgs([])).toEqual({ login: undefined, sync: false });
  });

  it("reads the first positional as the channel login", () => {
    expect(parseBackfillArgs(["mychannel"])).toEqual({ login: "mychannel", sync: false });
  });

  it("reads --sync wherever it appears and does not mistake it for a login", () => {
    expect(parseBackfillArgs(["--sync"])).toEqual({ login: undefined, sync: true });
    expect(parseBackfillArgs(["mychannel", "--sync"])).toEqual({ login: "mychannel", sync: true });
  });

  it("throws on an unknown flag rather than ignoring it", () => {
    expect(() => parseBackfillArgs(["--nope"])).toThrow(/--nope/);
  });

  it("throws on a second positional argument", () => {
    expect(() => parseBackfillArgs(["one", "two"])).toThrow();
  });
});
