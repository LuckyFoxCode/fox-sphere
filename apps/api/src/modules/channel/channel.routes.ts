import { NotFoundError } from "@fox-sphere/backend-shared";
import {
  ChannelListSchema,
  ChannelResponseSchema,
  CreateChannelDto,
  CreateChannelSchema,
  GetChannelParamsSchema,
} from "@fox-sphere/shared-schemas";
import { createModule } from "../../shared/openapi";
import { createChannel, getChannelById, listChannels } from "./channel.service";

const { router, route } = createModule("Channels");

route(
  {
    method: "get",
    path: "/channels",
    summary: "List channels",
    operationId: "listChannels",
    responses: {
      200: { description: "All channels", schema: ChannelListSchema },
      500: { description: "Unexpected server error" },
    },
  },
  async (_req, res) => {
    res.json(await listChannels());
  },
);

route(
  {
    method: "post",
    path: "/channels",
    summary: "Create a channel",
    operationId: "createChannel",
    request: { body: CreateChannelSchema },
    responses: {
      201: { description: "Channel created", schema: ChannelResponseSchema },
      400: { description: "Validation failed" },
      409: { description: "Channel with this twitchId already exists" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    const channel = await createChannel(req.body as CreateChannelDto);
    res.status(201).json(channel);
  },
);

route(
  {
    method: "get",
    path: "/channels/:id",
    summary: "Get channel by ID",
    operationId: "getChannelById",
    request: { params: GetChannelParamsSchema },
    responses: {
      200: { description: "Channel found", schema: ChannelResponseSchema },
      400: { description: "Invalid channel id" },
      404: { description: "Channel not found" },
      500: { description: "Unexpected server error" },
    },
  },
  async (req, res) => {
    const id = req.params.id as string;
    const channel = await getChannelById(id);
    if (!channel) throw new NotFoundError("Channel not found");
    res.json(channel);
  },
);

export { router as channelRouter };
