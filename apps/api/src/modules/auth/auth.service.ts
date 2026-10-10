import { UnauthorizedError } from "@fox-sphere/backend-shared";
import type { Response } from "express";
import { getSessionUser, type SessionUser } from "../../shared/middleware";

/**
 * The login behind the session cookie.
 *
 * `id` is the allowlisted Twitch user id `requireSession` verified at login time; `login` is the
 * display name. Neither is re-read from the cookie here - `requireSession` already checked the
 * HMAC once for this request, and verifying it a second time would only duplicate that work.
 */
export const getCurrentSession = (res: Response): { login: string } => {
  // `getSessionUser` is the typed reader for `res.locals`. The `| undefined` is in its type
  // parameter, not in the cast it performs, so a request that reached this route without a
  // session - a module mounted above `requireSession`, say - 401s here instead of answering
  // with `login: undefined`.
  const user = getSessionUser<SessionUser | undefined>(res);

  if (!user) throw new UnauthorizedError("No valid admin session");

  return { login: user.login };
};
