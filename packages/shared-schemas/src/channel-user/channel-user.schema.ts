import { z } from "zod";
import "../zod-extensions";

// `twitchId` and `username` live on `Viewer`, not on `ChannelUser` — the admin
// shows a viewer by name, so the response has to carry both even though the
// balance row is channel-scoped.
export const ChannelUserResponseSchema = z
  .object({
    twitchId: z.string().openapi({ example: "12345678" }),
    username: z.string().openapi({ example: "luckyfoxcode" }),
    coins: z.number(),
    lvl: z.number(),
    xp: z.number(),
    // The one DateTime among the transferred columns: `res.json` serialises it as
    // an ISO-8601 string, which is what the schema has to declare.
    lastXpAt: z.string().openapi({ example: "2026-10-07T12:00:00.000Z" }),
    isMod: z.boolean(),
    isFounder: z.boolean(),
    isSubscriber: z.boolean(),
    isPermanentVip: z.boolean(),
    spinsCount: z.number(),
    totalWin: z.number(),
    totalLoss: z.number(),
    xpThisWeek: z.number(),
    hasTicket: z.boolean(),
    isLuckyVip: z.boolean(),
  })
  .openapi("ChannelUser");

export type ChannelUserResponse = z.infer<typeof ChannelUserResponseSchema>;

export const PaginatedChannelUsersSchema = z
  .object({
    items: z.array(ChannelUserResponseSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
  })
  .openapi("PaginatedChannelUsers");

export type PaginatedChannelUsers = z.infer<
  typeof PaginatedChannelUsersSchema
>;

export const ChannelLeaderboardSchema = z
  .object({
    topCoins: z.array(ChannelUserResponseSchema),
    topXp: z.array(ChannelUserResponseSchema),
  })
  .openapi("ChannelLeaderboard");

export type ChannelLeaderboard = z.infer<typeof ChannelLeaderboardSchema>;
