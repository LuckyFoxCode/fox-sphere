import { UnauthorizedError } from "@fox-sphere/backend-shared";
import type { Response } from "express";
import { getSessionUser, type SessionUser } from "../../shared/middleware";

/**
 * The login behind the session cookie.
 *
 * `id` is the allowlisted Twitch user id `requireSession` verified at login time; `login` is the
 * handle Twitch assigns. `displayName` is the name the person chose on Twitch and is what the
 * panel shows, since "luckyfoxcode" is nobody's idea of their own name. It falls back to the
 * login, which covers the two ways it can be absent: a cookie signed before the field existed,
 * and a Twitch account whose display name was never set. Neither is re-read from the cookie
 * here - `requireSession` already checked the HMAC once for this request, and verifying it a
 * second time would only duplicate that work.
 */
export const getCurrentSession = (res: Response): { login: string; displayName: string } => {
  // `getSessionUser` is the typed reader for `res.locals`. The `| undefined` is in its type
  // parameter, not in the cast it performs, so a request that reached this route without a
  // session - a module mounted above `requireSession`, say - 401s here instead of answering
  // with `login: undefined`.
  const user = getSessionUser<SessionUser | undefined>(res);

  if (!user) throw new UnauthorizedError("No valid admin session");

  return { login: user.login, displayName: user.displayName ?? user.login };
};
