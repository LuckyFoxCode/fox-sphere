import {
  ChannelLeaderboardSchema,
  ChannelUserResponseSchema,
  GetChannelParamsSchema,
  GetChannelUserParamsSchema,
  ListChannelUsersQuerySchema,
  ListLeaderboardQuerySchema,
  PaginatedChannelUsersSchema,
  type ListChannelUsersQuery,
  type ListLeaderboardQuery,
} from "@fox-sphere/shared-schemas";
import { validatedQuery } from "../../shared/middleware";
import { createModule } from "../../shared/openapi";
import {
  getChannelLeaderboard,
  getChannelUser,
  listChannelUsers,
} from "./channel-user.service";

const { router, route } = createModule("ChannelUsers");

route(
  {
    method: "get",
    path: "/channels/:login/viewers",
    summary: "List a channel's viewers",
    operationId: "listChannelUsers",
    request: {
      params: GetChannelParamsSchema,
      query: ListChannelUsersQuerySchema,
    },
    responses: {
      200: {
        description: "Page of viewers; empty when the channel has none",
        schema: PaginatedChannelUsersSchema,
      },
      400: { description: "Invalid pagination" },
      404: { description: "Channel not found" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    const { page, perPage } = validatedQuery<ListChannelUsersQuery>(req);
    res.json(
      await listChannelUsers(req.params.login as string, page, perPage),
    );
  },
);

route(
  {
    method: "get",
    path: "/channels/:login/leaderboard",
    summary: "Get a channel's coin and xp leaderboards",
    operationId: "getChannelLeaderboard",
    request: {
      params: GetChannelParamsSchema,
      query: ListLeaderboardQuerySchema,
    },
    responses: {
      200: {
        description: "Top viewers by coins and by xp",
        schema: ChannelLeaderboardSchema,
      },
      400: { description: "Invalid limit" },
      404: { description: "Channel not found" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    const { limit } = validatedQuery<ListLeaderboardQuery>(req);
    res.json(await getChannelLeaderboard(req.params.login as string, limit));
  },
);

route(
  {
    method: "get",
    path: "/channels/:login/viewers/:twitchId",
    summary: "Get one viewer of a channel",
    operationId: "getChannelUser",
    request: { params: GetChannelUserParamsSchema },
    responses: {
      200: { description: "Viewer found", schema: ChannelUserResponseSchema },
      400: { description: "Invalid login or twitchId" },
      404: { description: "Channel or viewer not found" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    res.json(
      await getChannelUser(
        req.params.login as string,
        req.params.twitchId as string,
      ),
    );
  },
);

export { router as channelUserRouter };