import { z } from "zod";
import "../zod-extensions";

// Query and params schemas are inlined into the operation's `parameters`, never
// promoted to components.schemas, so they deliberately carry no `.openapi("Name")`.
export const ListChannelUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListChannelUsersQuery = z.infer<
  typeof ListChannelUsersQuerySchema
>;

// A hardcoded leaderboard size is the thing you come back to change, so it is a
// parameter. `limit` is capped like `perPage` — over the cap is a 400, not a clamp.
export const ListLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListLeaderboardQuery = z.infer<typeof ListLeaderboardQuerySchema>;

export const GetChannelUserParamsSchema = z.object({
  login: z.string().openapi({ param: { name: "login", in: "path" } }),
  twitchId: z.string().openapi({ param: { name: "twitchId", in: "path" } }),
});

export type GetChannelUserParams = z.infer<typeof GetChannelUserParamsSchema>;