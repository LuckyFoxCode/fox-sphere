import { NotFoundError, prisma } from "@fox-sphere/backend-shared";
import type {
  ChannelLeaderboard,
  ChannelUserResponse,
  PaginatedChannelUsers,
} from "@fox-sphere/shared-schemas";

/**
 * WHY THIS READS `User` AND NOT `ChannelUser` — and why that is temporary.
 *
 * The channel-scoped tables exist (Release A) and this module originally read
 * `ChannelUser`, which is the direction multi-tenancy wants. But nothing in
 * apps/bot-runtime writes there yet: the bot writes `User`, and the only writer
 * of `ChannelUser` is the backfill script in insert-only mode, which never
 * touches an existing row. So reading `ChannelUser` here showed a snapshot that
 * stopped moving the moment it was taken — the panel's coins drifted further from
 * live chat by the minute, and the only fix was a manual `backfill:channels
 * --sync`, which is a converging write against production balances.
 *
 * `User` is the source of truth until Release B moves the bot, so this reads
 * `User`: the panel then shows what the bot wrote seconds ago, and no sync is
 * needed at any point. The response DTO is unchanged — `ChannelUser` inlined the
 * three lottery fields that live in `UserLottery` here, and the identity columns
 * come off `User` directly instead of through `viewer` — so the committed
 * OpenAPI document and the generated admin client are byte-identical either way.
 *
 * RELEASE B SWAPS THIS FILE BACK, not the DTO. When the bot moves to
 * `ChannelUser`, this `select` becomes the `ChannelUser` one and every filter
 * below regains its `channelId`. The panel needs no change at that point, and
 * until then this is not a mistake to be tidied up - it is the correct table for
 * this deployment.
 *
 * One consequence worth stating: with a single channel there is nothing to scope
 * by, so the queries below carry no channel filter at all. That is correct while
 * the deployment has one channel and would be wrong the moment it has two -
 * which is exactly why the swap above is scoped to Release B and not optional.
 */
const userSelect = {
  twitchId: true,
  username: true,
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
  // The three lottery fields are the only ones `User` does not carry inline;
  // `ChannelUser` has them as columns, `User` keeps them in a 1:1 table.
  lotteryContext: { select: { xpThisWeek: true, hasTicket: true, isLuckyVip: true } },
} as const;

// A selected row, before flattening. Derived from the response type so that
// adding a field to the response makes this file fail to compile until the
// `select` and the mapper below carry it too.
type ChannelUserRow = Omit<
  ChannelUserResponse,
  "twitchId" | "username" | "lastXpAt" | "xpThisWeek" | "hasTicket" | "isLuckyVip"
> & {
  twitchId: string;
  username: string;
  lastXpAt: Date;
  // Null for a viewer who never touched the lottery: `UserLottery` is an
  // optional 1:1 relation, so the row simply does not exist yet. `ChannelUser`
  // carries these three as columns with non-null defaults, which is what the
  // mapper below falls back to.
  lotteryContext: { xpThisWeek: number; hasTicket: boolean; isLuckyVip: boolean } | null;
};

/**
 * Flattens a selected row into the flat `ChannelUser` response shape, and is the
 * single place `lastXpAt` crosses from `Date` to the ISO string the schema
 * declares — the row never reaches `res.json` in its Prisma shape.
 */
const toChannelUserResponse = (row: ChannelUserRow): ChannelUserResponse => ({
  twitchId: row.twitchId,
  username: row.username,
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
  // The `??` defaults are the column defaults `ChannelUser` would have applied:
  // xpThisWeek 0, hasTicket false, isLuckyVip false. Without them a viewer with
  // no lottery row would serialise nulls into a response schema that says number
  // and boolean, and the admin would render "null" in a balance column.
  xpThisWeek: row.lotteryContext?.xpThisWeek ?? 0,
  hasTicket: row.lotteryContext?.hasTicket ?? false,
  isLuckyVip: row.lotteryContext?.isLuckyVip ?? false,
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
  // Resolves the login and 404s an unknown channel, exactly as before - but the
  // row set is no longer scoped by it. See the note on `userSelect`: with one
  // channel there is nothing to scope by, and the bot writes `User` regardless.
  await requireChannelByLogin(login);

  const [total, rows] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.findMany({
      select: userSelect,
      // `twitchId` breaks ties so pagination is stable; without it a viewer
      // straddling a page boundary can appear on both pages or on neither.
      orderBy: [{ xp: "desc" }, { twitchId: "asc" }],
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
  await requireChannelByLogin(login);

  const [topCoins, topXp] = await prisma.$transaction([
    prisma.user.findMany({
      select: userSelect,
      orderBy: [{ coins: "desc" }, { twitchId: "asc" }],
      take: limit,
    }),
    prisma.user.findMany({
      select: userSelect,
      orderBy: [{ xp: "desc" }, { twitchId: "asc" }],
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
  await requireChannelByLogin(login);

  // `twitchId` is `@unique` on `User`, so this is a findUnique rather than the
  // findFirst the `ChannelUser` version needed behind its `viewer` filter.
  const row = await prisma.user.findUnique({
    where: { twitchId },
    select: userSelect,
  });

  if (!row) throw new NotFoundError("Channel user not found");

  return toChannelUserResponse(row);
};
