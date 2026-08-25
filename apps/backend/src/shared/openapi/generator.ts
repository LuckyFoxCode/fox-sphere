import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { registry } from "./registry.js";

export const generateOpenAPISpec = () =>
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Fox Sphere API",
      description: "REST API for the Fox Sphere Twitch bot platform",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
