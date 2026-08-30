import { z } from "zod";

import { registry } from "../../shared/openapi";

registry.registerPath({
  method: "get",
  path: "/api/hello",
  summary: "Test hello-world endpoint",
  responses: {
    200: {
      description: "Hello message",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});