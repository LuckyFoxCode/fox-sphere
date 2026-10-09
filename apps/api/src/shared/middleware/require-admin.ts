import { timingSafeEqual } from "node:crypto";
import { AppError, config, UnauthorizedError } from "@fox-sphere/backend-shared";
import type { NextFunction, Request, Response } from "express";

export const ADMIN_KEY_HEADER = "x-admin-key";

/**
 * `timingSafeEqual` throws on a length mismatch, so a wrong-length key has to be
 * compared against a same-length dummy first. Returning early on `!a || !b` would
 * leak the key's length through the response time.
 */
const keysMatch = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
};

/**
 * Rejects any request without the admin key.
 *
 * `apps/api` has no per-viewer authorisation — every route returns channel-wide data —
 * and it serves `cors()` unrestricted, so any site open in a browser can read this API from
 * localhost. This is the first lock on the door; a Twitch OAuth session replaces the key
 * check without moving it.
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const expected = config.adminKey;

  // Fails closed. An unset ADMIN_KEY is a misconfiguration, and the tempting repair — treat
  // "no key configured" as "no key required" — is the one that silently reopens the API. Every
  // request 500s with an explicit message instead, which points straight at the missing variable.
  if (!expected) {
    throw new AppError(
      "ADMIN_KEY is not set - refusing to serve admin routes unauthenticated",
      500,
    );
  }

  const provided = req.header(ADMIN_KEY_HEADER);

  if (!provided || !keysMatch(provided, expected)) {
    throw new UnauthorizedError("Invalid or missing admin key");
  }

  next();
};
