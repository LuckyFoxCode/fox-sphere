import { config, errorHandler, NotFoundError } from "@fox-sphere/backend-shared";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
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

// There is no /docs and no /openapi.json here. Both used to be mounted above requireSession, so
// an anonymous visitor got the page instead of a JSON 401 — the right trade while this app was
// local-only and an open route table cost nothing. This app is deployed now, and the page cannot
// be gated the way the data is: Swagger fetches its page and issues its "Try it out" requests
// from the browser itself, straight at this origin, and nothing in that path could act on a 401.
// The panel has no fetch wrapper left to borrow — `src/lib/session.ts` holds login() and
// logout(), and login is an explicit button the operator presses — so a 401 there renders as raw
// JSON on a page that would otherwise have worked. Note the asymmetry that settles it the other
// way: cookies are host-scoped and port-agnostic, so a browser already holding fx_session *would*
// send it with Swagger's own requests. Those requests can be authenticated; the page cannot, and
// the page is the route table. So the block was deleted rather than locked - and
// `.docker/Caddyfile.admin` answers 404 for both paths as well, so the answer does not depend on
// anything in this file staying true.
//
// The spec itself is untouched: `pnpm openapi:dump` still writes apps/api/openapi.json and orval
// still turns that file into the panel's typed client, and both are committed. Only the
// human-readable rendering of it is gone. Bringing it back means authenticating it first, not
// moving the mount back up here.

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

  res.cookie(SESSION_COOKIE, signSessionCookie(identity.userId, identity.login), sessionCookieOptions());
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
