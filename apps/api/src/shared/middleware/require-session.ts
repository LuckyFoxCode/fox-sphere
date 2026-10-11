import { AppError, config, UnauthorizedError } from "@fox-sphere/backend-shared";
import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifySessionCookie } from "../auth";

export type SessionUser = { id: string; login: string };

/**
 * Rejects any request without a valid admin session cookie.
 *
 * Fails closed, and the reason matters: an unset ADMIN_SESSION_SECRET is a misconfiguration, and
 * the tempting repair - "no secret configured, so no secret needed" - is exactly the one that
 * silently reopens the API. Every request 500s with an explicit message instead, which points
 * straight at the missing variable.
 */
export const requireSession = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!config.adminSessionSecret) {
    throw new AppError(
      "ADMIN_SESSION_SECRET is not set - refusing to serve admin routes unauthenticated",
      500,
    );
  }

  const cookie = req.cookies?.[SESSION_COOKIE];
  const payload = cookie ? verifySessionCookie(cookie) : null;

  if (!payload) {
    throw new UnauthorizedError("No valid admin session");
  }

  res.locals.sessionUser = { id: payload.sub, login: payload.login } satisfies SessionUser;
  next();
};

/**
 * Reads the authenticated user placed by `requireSession`.
 *
 * Typed by the caller, because the cast it performs cannot see the shape of `res.locals`:
 *
 *   const { login } = getSessionUser<SessionUser>(res);
 */
export const getSessionUser = <T>(res: Response): T => res.locals.sessionUser as T;
