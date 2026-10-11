export interface LegacyUser {
  twitchId: string;
  username: string;
  coins: number;
  lvl: number;
  xp: number;
  lastXpAt: Date;
  isMod: boolean;
  isFounder: boolean;
  isSubscriber: boolean;
  isPermanentVip: boolean;
  spinsCount: number;
  totalWin: number;
  totalLoss: number;
}

export interface LegacyUserLottery {
  twitchId: string;
  xpThisWeek: number;
  hasTicket: boolean;
  isLuckyVip: boolean;
}

export interface ViewerRow {
  twitchId: string;
  username: string;
}

export interface ChannelUserRow {
  channelId: string;
  viewerId: string;
  coins: number;
  lvl: number;
  xp: number;
  lastXpAt: Date;
  isMod: boolean;
  isFounder: boolean;
  isSubscriber: boolean;
  isPermanentVip: boolean;
  spinsCount: number;
  totalWin: number;
  totalLoss: number;
  xpThisWeek: number;
  hasTicket: boolean;
  isLuckyVip: boolean;
}

const NO_LOTTERY = { xpThisWeek: 0, hasTicket: false, isLuckyVip: false } as const;

export const buildViewerRows = (users: readonly LegacyUser[]): ViewerRow[] =>
  users.map(({ twitchId, username }) => ({ twitchId, username }));

export const buildChannelUserRows = (
  users: readonly LegacyUser[],
  lotteries: readonly LegacyUserLottery[],
  channelId: string,
  viewerIdByTwitchId: ReadonlyMap<string, string>,
): ChannelUserRow[] => {
  const lotteryByTwitchId = new Map(lotteries.map((lottery) => [lottery.twitchId, lottery]));

  return users.map((user) => {
    const viewerId = viewerIdByTwitchId.get(user.twitchId);
    if (viewerId === undefined) {
      throw new Error(`No viewer id for twitchId ${user.twitchId}`);
    }

    const lottery = lotteryByTwitchId.get(user.twitchId) ?? NO_LOTTERY;

    return {
      channelId,
      viewerId,
      coins: user.coins,
      lvl: user.lvl,
      xp: user.xp,
      lastXpAt: user.lastXpAt,
      isMod: user.isMod,
      isFounder: user.isFounder,
      isSubscriber: user.isSubscriber,
      isPermanentVip: user.isPermanentVip,
      spinsCount: user.spinsCount,
      totalWin: user.totalWin,
      totalLoss: user.totalLoss,
      xpThisWeek: lottery.xpThisWeek,
      hasTicket: lottery.hasTicket,
      isLuckyVip: lottery.isLuckyVip,
    };
  });
};

/**
 * The identity of a `ChannelUser` row - the composite unique key the row is
 * identified by (`@@unique([channelId, viewerId])`).
 */
export const channelUserKey = (channelId: string, viewerId: string): string =>
  `${channelId}:${viewerId}`;

/**
 * Keeps only the rows that are absent from `existingKeys`, preserving the given order.
 * Selecting before writing is what makes the backfill insert-only: an already-present row
 * is never handed to a write, so a stale `User` row cannot overwrite a live `ChannelUser`.
 */
export const selectMissingRows = (
  rows: readonly ChannelUserRow[],
  existingKeys: ReadonlySet<string>,
): ChannelUserRow[] =>
  rows.filter((row) => !existingKeys.has(channelUserKey(row.channelId, row.viewerId)));

export interface BackfillArgs {
  login?: string;
  sync: boolean;
}

/**
 * Reads the channel login and the flags out of one argv slice.
 *
 * Flags are collected separately from positionals because an `argv[2]`-only read would
 * treat `backfill:channels --sync` as a channel named `--sync`.
 * A parser that stopped at the first argument it did not recognise would hand `--sync` back
 * as the channel name and backfill a channel that does not exist, so flags are recognised
 * wherever they appear and anything unknown is refused rather than silently ignored.
 */
export const parseBackfillArgs = (argv: readonly string[]): BackfillArgs => {
  const positionals: string[] = [];
  let sync = false;

  for (const arg of argv) {
    if (arg === "--sync") {
      sync = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length > 1) {
    throw new Error(`Expected at most one channel login, got ${positionals.length}`);
  }

  return { login: positionals[0], sync };
};
