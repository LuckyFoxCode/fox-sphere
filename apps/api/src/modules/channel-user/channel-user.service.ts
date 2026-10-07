import { NotFoundError, prisma } from "@fox-sphere/backend-shared";
import type {
  ChannelLeaderboard,
  ChannelUserResponse,
  PaginatedChannelUsers,
} from "@fox-sphere/shared-schemas";

/**
 * `twitchId` and `username` live on `Viewer`, not on `ChannelUser`, so the two
 * identity columns come in through the relation and every balance column is
 * selected on the row itself. The same holds for the tiebreaker in `orderBy`
 * below: `twitchId` is a `Viewer` column, so it sorts as `viewer.twitchId`.
 */
const channelUserSelect = {
  coins: true,
  lvl: true,
  xp: true,
  lastXpAt: true,
  isMod: true,
  isFounder: true,
  isSubscriber: true,
  isPermanentVip: true,
  spinsCount: true,
  totalWin: true,
  totalLoss: true,
  xpThisWeek: true,
  hasTicket: true,
  isLuckyVip: true,
  viewer: { select: { twitchId: true, username: true } },
} as const;

// A selected row, before flattening. Derived from the response type so that
// adding a field to `ChannelUser` makes this file fail to compile until the
// `select` and the mapper below carry it too.
type ChannelUserRow = Omit<
  ChannelUserResponse,
  "twitchId" | "username" | "lastXpAt"
> & {
  lastXpAt: Date;
  viewer: { twitchId: string; username: string };
};

/**
 * Flattens a selected row into the flat `ChannelUser` response shape, and is the
 * single place `lastXpAt` crosses from `Date` to the ISO string the schema
 * declares — the row never reaches `res.json` in its Prisma shape.
 */
const toChannelUserResponse = (row: ChannelUserRow): ChannelUserResponse => ({
  twitchId: row.viewer.twitchId,
  username: row.viewer.username,
  coins: row.coins,
  lvl: row.lvl,
  xp: row.xp,
  lastXpAt: row.lastXpAt.toISOString(),
  isMod: row.isMod,
  isFounder: row.isFounder,
  isSubscriber: row.isSubscriber,
  isPermanentVip: row.isPermanentVip,
  spinsCount: row.spinsCount,
  totalWin: row.totalWin,
  totalLoss: row.totalLoss,
  xpThisWeek: row.xpThisWeek,
  hasTicket: row.hasTicket,
  isLuckyVip: row.isLuckyVip,
});

const requireChannelByLogin = async (login: string) => {
  const channel = await prisma.channel.findUnique({ where: { login } });

  if (!channel) throw new NotFoundError("Channel not found");

  return channel;
};

/**
 * A channel with no viewers is a real, successful page — `total: 0`, not a 404.
 * The 404 belongs to a login that resolves to no channel at all.
 */
export const listChannelUsers = async (
  login: string,
  page: number,
  perPage: number,
): Promise<PaginatedChannelUsers> => {
  const channel = await requireChannelByLogin(login);
  const where = { channelId: channel.id };

  const [total, rows] = await prisma.$transaction([
    prisma.channelUser.count({ where }),
    prisma.channelUser.findMany({
      where,
      select: channelUserSelect,
      // `twitchId` breaks ties so pagination is stable; without it a viewer
      // straddling a page boundary can appear on both pages or on neither.
      orderBy: [{ xp: "desc" }, { viewer: { twitchId: "asc" } }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    items: rows.map(toChannelUserResponse),
    total,
    page,
    perPage,
  };
};

export const getChannelLeaderboard = async (
  login: string,
  limit: number,
): Promise<ChannelLeaderboard> => {
  const channel = await requireChannelByLogin(login);
  const where = { channelId: channel.id };

  const [topCoins, topXp] = await prisma.$transaction([
    prisma.channelUser.findMany({
      where,
      select: channelUserSelect,
      orderBy: [{ coins: "desc" }, { viewer: { twitchId: "asc" } }],
      take: limit,
    }),
    prisma.channelUser.findMany({
      where,
      select: channelUserSelect,
      orderBy: [{ xp: "desc" }, { viewer: { twitchId: "asc" } }],
      take: limit,
    }),
  ]);

  return {
    topCoins: topCoins.map(toChannelUserResponse),
    topXp: topXp.map(toChannelUserResponse),
  };
};

export const getChannelUser = async (
  login: string,
  twitchId: string,
): Promise<ChannelUserResponse> => {
  const channel = await requireChannelByLogin(login);

  const row = await prisma.channelUser.findFirst({
    where: { channelId: channel.id, viewer: { twitchId } },
    select: channelUserSelect,
  });

  if (!row) throw new NotFoundError("Channel user not found");

  return toChannelUserResponse(row);
};