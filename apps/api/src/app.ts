import { errorHandler, Logger, NotFoundError } from "@fox-sphere/backend-shared";
import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import { generateOpenAPISpec } from "./shared/openapi";
import { modules } from "./modules";

const app: Express = express();
const httpServer = createServer(app);

// No Socket.io here on purpose. This app serves the admin panel over HTTP; the
// realtime surface (and the worker's /api/internal/events bridge that feeds it)
// belongs to apps/bot-runtime, which is the process the overlay connects to.

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

for (const { prefix, router } of modules) {
  app.use(prefix, router);
}

// A docs defect must not take the API down with it: without the guard, a route
// with incomplete OpenAPI metadata throws at import and nothing serves at all.
let openApiSpec: ReturnType<typeof generateOpenAPISpec> | null = null;
try {
  openApiSpec = generateOpenAPISpec();
} catch (error) {
  Logger.error(
    "OpenAPI",
    "Spec generation failed - /docs and /openapi.json are disabled, the API still serves",
    error,
  );
}

if (openApiSpec) {
  const spec = openApiSpec;
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/openapi.json", (_req, res) => res.json(spec));
}

// Anything unmatched gets a JSON 404. Express's HTML default explodes in the
// generated client, which JSON.parses every response body.
app.use((req, _res, next) =>
  next(new NotFoundError(`No route for ${req.method} ${req.originalUrl}`)),
);

app.use(errorHandler);

export { app, httpServer };
