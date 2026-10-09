import { errorHandler, Logger, NotFoundError } from "@fox-sphere/backend-shared";
import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import { requireAdmin } from "./shared/middleware";
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

// The key guards the DATA, not the documentation.
//
// Swagger's page is fetched by the browser itself and its "Try it out" buttons issue their own
// requests — neither goes through apps/admin's fetch wrapper, so a middleware mounted above
// /docs would 401 a page that has no way to attach the key. The docs are also read-only and
// carry no viewer data; what is worth protecting is the route table that leaks nothing and the
// payloads that leak balances.
//
// The trade-off: the route list is readable by anything that can reach this server. That is
// acceptable while apps/api is local-only and undeployed. When it goes to production, delete
// this block rather than locking it — a Swagger UI for an internal admin API has no business
// being public, and dropping it is simpler than authenticating it.
app.use(requireAdmin);

for (const { prefix, router } of modules) {
  app.use(prefix, router);
}

// Anything unmatched gets a JSON 404. Express's HTML default explodes in the
// generated client, which JSON.parses every response body.
app.use((req, _res, next) =>
  next(new NotFoundError(`No route for ${req.method} ${req.originalUrl}`)),
);

app.use(errorHandler);

export { app, httpServer };
