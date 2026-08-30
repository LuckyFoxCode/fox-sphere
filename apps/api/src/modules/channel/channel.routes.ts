import {
  ChannelResponseSchema,
  GetChannelParamsSchema,
} from "@fox-sphere/shared-schemas";
import { NotFoundError } from "@fox-sphere/backend-shared";
import { createModule } from "../../shared/openapi";
import { getChannelById } from "./channel.service";

const { router, route } = createModule("Channels");

route(
  {
    method: "get",
    path: "/channels/:id",
    summary: "Get channel by ID",
    operationId: "getChannelById",
    request: { params: GetChannelParamsSchema },
    responses: {
      200: { description: "Channel found", schema: ChannelResponseSchema },
      404: { description: "Channel not found" },
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
