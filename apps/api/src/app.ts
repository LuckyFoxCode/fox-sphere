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
  fetchDisplayName,
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
// Still an echo, not an allowlist - any Origin is reflected. And it IS marginally looser than the
// bare cors() it replaces, not "no looser": bare cors() answered `ACAO: *` with no
// Access-Control-Allow-Credentials, which a browser refuses to honour for a credentialed
// cross-origin read, so the caller could not read the response at all. Reflecting the Origin and
// adding the credentials header lets the request go out and the response be read. `SameSite=Lax`,
// not CORS, is what withholds fx_session on that cross-site request, so what a cross-origin
// caller actually reads is the 401 from requireSession below - never data. requireSession, not
// these headers, is what guards the data.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// The spec is generated here, at import, but not served until much further down - behind
// requireSession. A docs defect must not take the API down with it either: without this guard a
// route with incomplete OpenAPI metadata throws at import and nothing serves at all. (`pnpm
// openapi:dump` fails the same way, so CI catches the real cause long before this path matters.)
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

// The OAuth routes are mounted directly, NOT through route(), and are absent from the spec on
// purpose: they answer with 302 redirects, which the response-schema model in define-route.ts
// cannot express and which orval would turn into a hook that throws when called - a browser
// `fetch` follows the redirect to Twitch's HTML login page and the generated parser chokes on it.
// The only correct way to start the flow is window.location.assign, which does not use the
// generated client at all. Health and these three routes are the documented exceptions to
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

  // After the allowlist, not before: it is one extra request, and an account that is not an admin
  // has no business costing the panel a call to Helix. Null falls back to the login in the cookie.
  const displayName = await fetchDisplayName(identity.userId);

  res.cookie(
    SESSION_COOKIE,
    signSessionCookie(identity.userId, identity.login, displayName ?? identity.login),
    sessionCookieOptions(),
  );
  res.redirect("/");
});

// POST, not a link. SameSite=Lax still sends the cookie on a top-level GET navigation, so a GET
// logout could be triggered from any third-party page with an <img> tag. Lax withholds the cookie
// from cross-site POST, which is what makes the whole CSRF story work without a token.
//
// 204, deliberately not a redirect. The caller is a `fetch` (src/lib/session.ts), and a redirect
// here walked the whole chain under fetch's CORS rules: this route -> /auth/twitch/login ->
// id.twitch.tv/oauth2/authorize -> www.twitch.tv/login. The last hop is cross-origin and Twitch
// sends no Access-Control-Allow-Origin for it, so fetch rejected and the caller's
// `window.location.assign(LOGIN_PATH)` after the await never ran - logout cleared the cookie and
// then left the user on a stale panel with a CORS error in the console. The client navigates
// itself; the server has nothing useful to redirect to.
app.post("/api/auth/twitch/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).end();
});

app.use(requireSession);

// `/docs` and `/openapi.json` sit behind the guard like every other route here. They used to be
// mounted ABOVE it, on the claim that Swagger cannot carry a session — and that claim was wrong
// twice over. Cookies are host-scoped and port-agnostic, so a browser holding `fx_session` sends
// it here no matter what rendered the page; and `src/lib/session.ts` has no fetch wrapper left to
// act on a 401 anyway, so there was no redirect-to-login to preserve. There was also less to
// protect than it looked: `apps/api/openapi.json` is committed and orval builds the panel's
// client from it, so the route table is already published in the repository. Hiding it from this
// process protected nothing that git does not publish anyway.
//
// What actually keeps the deployed panel closed is at the edge, not here:
// `.docker/Caddyfile.admin` answers 404 for both paths before a request reaches this app, and
// the only published port is bound to loopback. This guard is the second layer, not the first -
// keep it, but do not believe removing it would be the thing that mattered.
if (openApiSpec) {
  const spec = openApiSpec;
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/openapi.json", (_req, res) => res.json(spec));
}

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
