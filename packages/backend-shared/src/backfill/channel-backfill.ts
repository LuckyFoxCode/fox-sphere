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
