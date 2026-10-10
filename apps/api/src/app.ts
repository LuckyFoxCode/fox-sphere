import { config, errorHandler, Logger, NotFoundError } from "@fox-sphere/backend-shared";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  buildAuthorizeUrl,
  createStateValue,
  exchangeCodeForToken,
  sessionCookieOptions,
  signSessionCookie,
  stateCookieOptions,
  validateToken,
} from "./shared/auth";
import { requireSession } from "./shared/middleware";
import { generateOpenAPISpec } from "./shared/openapi";
import { modules } from "./modules";

const app: Express = express();
const httpServer = createServer(app);

// No Socket.io here on purpose. This app serves the admin panel over HTTP; the
// realtime surface (and the worker's /api/internal/events bridge that feeds it)
// belongs to apps/bot-runtime, which is the process the overlay connects to.

// `origin: true` reflects the request's own Origin instead of sending `*`, and `credentials: true`
// adds Access-Control-Allow-Credentials. Neither is what carries the session cookie: the panel
// reaches this server same-origin through Vite's `/api` proxy (apps/admin/vite.config.ts), so the
// browser never consults CORS. What withholds the cookie from a cross-site fetch is `SameSite=Lax`
// in shared/auth/session.ts.
//
// Still an echo, not an allowlist - any Origin is reflected, which is no looser than the bare
// cors() it replaces. requireSession below, not these headers, is what guards the data.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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

// The session guards the DATA, not the documentation.
//
// Swagger's page is fetched by the browser itself and its "Try it out" buttons issue their own
// requests — neither goes through apps/admin's fetch wrapper, so a middleware mounted above
// /docs would 401 a page that has no way to carry the session cookie. The docs are also
// read-only and carry no viewer data; what is worth protecting is the route table that leaks
// nothing and the payloads that leak balances.
//
// The trade-off: the route list is readable by anything that can reach this server. That is
// acceptable while apps/api is local-only and undeployed. When it goes to production, delete
// this block rather than locking it — a Swagger UI for an internal admin API has no business
// being public, and dropping it is simpler than authenticating it.

// The OAuth routes are mounted directly, NOT through route(), and are absent from the spec on
// purpose: they answer with 302 redirects, which the response-schema model in define-route.ts
// cannot express and which orval would turn into a hook that throws when called - a browser
// `fetch` follows the redirect to Twitch's HTML login page and the generated parser chokes on it.
// The only correct way to start the flow is window.location.assign, which does not use the
// generated client at all. Health, docs and these three routes are the documented exceptions to
// "never call router.get directly".
app.get("/api/auth/twitch/login", (_req, res) => {
  const state = createStateValue();

  res.cookie(STATE_COOKIE, state, stateCookieOptions());
  res.redirect(buildAuthorizeUrl(state));
});

// Cleared on BOTH paths on purpose. Deleting it only when the state matches would let an
// intercepted callback be replayed while the cookie is still inside its 5-minute window.
app.get("/api/auth/twitch/callback", async (req, res) => {
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, stateCookieOptions());

  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const denied = typeof req.query.error === "string" ? req.query.error : undefined;

  if (denied) {
    res.status(403).json({ status: "error", message: "Twitch authorization was declined" });
    return;
  }

  if (!expectedState || !state || state !== expectedState || !code) {
    res.status(400).json({
      status: "error",
      message: "OAuth state mismatch - refusing to complete the login",
    });
    return;
  }

  const accessToken = await exchangeCodeForToken(code);
  const identity = await validateToken(accessToken);

  if (identity.userId !== config.adminTwitchUserId) {
    // No session is issued. This is the check that matters most: everything else is plumbing.
    res.status(403).json({
      status: "error",
      message: "This Twitch account is not an admin",
    });
    return;
  }

  res.cookie(SESSION_COOKIE, signSessionCookie(identity.userId, identity.login), sessionCookieOptions());
  res.redirect("/");
});

// POST, not a link. SameSite=Lax still sends the cookie on a top-level GET navigation, so a GET
// logout could be triggered from any third-party page with an <img> tag. Lax withholds the cookie
// from cross-site POST, which is what makes the whole CSRF story work without a token.
app.post("/api/auth/twitch/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.redirect("/api/auth/twitch/login");
});

app.use(requireSession);

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
