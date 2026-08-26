import { GetChannelParamsSchema, ChannelResponseSchema } from "@fox-sphere/shared-schemas";
import { registry } from "../../shared/openapi";

registry.registerPath({
  method: "get",
  path: "/channels/{id}",
  summary: "Get channel by ID",
  request: {
    params: GetChannelParamsSchema,
  },
  responses: {
    200: {
      description: "Channel found",
      content: {
        "application/json": {
          schema: ChannelResponseSchema,
        },
      },
    },
    404: {
      description: "Channel not found",
    },
  },
});
