import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "@fox-sphere/backend-shared";

export const SESSION_COOKIE = "fx_session";
export const STATE_COOKIE = "fx_oauth_state";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STATE_TTL_MS = 5 * 60 * 1000;

export type SessionPayload = { sub: string; login: string; exp: number };

const encode = (value: string): string => Buffer.from(value, "utf8").toString("base64url");

/**
 * One source of truth for every cookie option.
 *
 * `res.cookie` and `res.clearCookie` MUST be given identical options: the browser matches a
 * deletion against the stored cookie by name + path + domain + SameSite + Secure. A mismatch
 * anywhere means the browser silently ignores the delete and logout "works" zero times. This
 * object exists so the two call sites cannot drift.
 */
const baseCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.nodeEnv === "production",
  path: "/",
});

export const sessionCookieOptions = () => ({ ...baseCookieOptions(), maxAge: SESSION_TTL_MS });

export const stateCookieOptions = () => ({
  ...baseCookieOptions(),
  // Narrow path: the state cookie is read by exactly one route and must not ride along
  // on every other request the panel makes.
  path: "/api/auth/twitch",
  maxAge: STATE_TTL_MS,
});

export const createStateValue = (): string => randomBytes(32).toString("base64url");

const sign = (payload: string, secret: string): string =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const signSessionCookie = (userId: string, login: string): string => {
  const secret = config.adminSessionSecret;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");

  const payload = encode(
    JSON.stringify({ sub: userId, login, exp: Date.now() + SESSION_TTL_MS }),
  );
  return `${payload}.${sign(payload, secret)}`;
};

export const verifySessionCookie = (value: string): SessionPayload | null => {
  const secret = config.adminSessionSecret;
  if (!secret) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  // timingSafeEqual throws on a length mismatch, so a wrong-length signature is compared
  // against itself first - returning early on length would leak nothing useful here, but
  // throwing inside a middleware turns every bad cookie into a 500.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;

    if (typeof parsed.sub !== "string" || typeof parsed.login !== "string") return null;
    if (typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;

    return parsed;
  } catch {
    return null;
  }
};
