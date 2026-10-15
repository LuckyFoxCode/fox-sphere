import { config, AppError, Logger } from "@fox-sphere/backend-shared";

const AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";
const HELIX_USERS_URL = "https://api.twitch.tv/helix/users";

/**
 * No `scope` parameter, deliberately.
 *
 * The panel needs identity and nothing else - it never reads the channel, never writes chat. A
 * scope list here would put a permissions dialog in front of every login for rights we do not
 * use. Twitch's parameter table marks `scope` as required; a Twitch developer confirmed on their
 * forum that leaving it blank works for identity confirmation, and `/validate` returns `user_id`
 * either way - verified: the token it issues validates fine, with `"scopes": null`.
 *
 * The blank scope is why display name needs a *second* credential - see `fetchDisplayName`.
 *
 * `force_verify=true` re-shows the consent screen on every login. For a panel that exposes every
 * viewer's balance, seeing exactly what you are logging into is worth the extra click.
 */
export const buildAuthorizeUrl = (state: string): string => {
  const redirectUri = config.adminOAuthRedirectUri;
  if (!redirectUri) {
    throw new AppError("ADMIN_OAUTH_REDIRECT_URI is not set", 500);
  }

  const params = new URLSearchParams({
    client_id: config.twitch.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    force_verify: "true",
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const redirectUri = config.adminOAuthRedirectUri;
  if (!redirectUri) {
    throw new AppError("ADMIN_OAUTH_REDIRECT_URI is not set", 500);
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.twitch.clientId,
      client_secret: config.twitch.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new AppError("Twitch rejected the authorization code", 502);
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new AppError("Twitch returned no access token", 502);
  }

  return body.access_token;
};

export const validateToken = async (
  accessToken: string,
): Promise<{ userId: string; login: string }> => {
  const response = await fetch(VALIDATE_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (!response.ok) {
    throw new AppError("Twitch could not validate the access token", 502);
  }

  const body = (await response.json()) as { user_id?: string; login?: string };
  if (!body.user_id || !body.login) {
    throw new AppError("Twitch returned an incomplete token identity", 502);
  }

  return { userId: body.user_id, login: body.login };
};

/**
 * An app access token, cached for the process.
 *
 * `client_credentials` is the server-to-server grant: no user, no consent screen, no scopes, and
 * `expires_in` around 63 days. Holding the promise rather than the token means two logins racing
 * cannot both hit Twitch, and a failure clears the cache so the next attempt retries rather than
 * serving a poisoned one for the life of the process.
 */
let appToken: Promise<{ token: string; expiresAt: number }> | null = null;

const getAppAccessToken = async (): Promise<string> => {
  if (!appToken) {
    appToken = (async () => {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.twitch.clientId,
          client_secret: config.twitch.clientSecret,
          grant_type: "client_credentials",
        }),
      });

      if (!response.ok) {
        throw new AppError("Twitch refused an app access token", 502);
      }

      const body = (await response.json()) as { access_token?: string; expires_in?: number };
      if (!body.access_token) {
        throw new AppError("Twitch returned no app access token", 502);
      }

      // Five minutes of margin, so a token cannot lapse between the check and the call.
      return {
        token: body.access_token,
        expiresAt: Date.now() + (body.expires_in ?? 0) * 1000 - 5 * 60 * 1000,
      };
    })().catch((error: unknown) => {
      appToken = null;
      throw error;
    });
  }

  const current = await appToken;

  if (current.expiresAt <= Date.now()) {
    appToken = null;
    return await getAppAccessToken();
  }

  return current.token;
};

/**
 * The name the person calls themselves, or `null` if Twitch will not say.
 *
 * `/oauth2/validate` does not carry it. Measured on this account, its whole response is
 * `{client_id, login, scopes, user_id, expires_in}` - there is no display name field to read, so
 * "it comes free beside `user_id`" is wrong and cost a round to find out.
 *
 * This uses an app access token rather than the one the user just granted, and that is not a
 * preference. Helix rejects the panel's user token outright - `HTTP 401`, message "OAuth token is
 * missing" - because that token carries no scope at all, which `buildAuthorizeUrl` does on purpose.
 * The same request with a `client_credentials` token answers 200 with the display name. Verified
 * end to end against the real API, not inferred.
 *
 * Returns null rather than throwing. The display name is a nicety, and a login that fails because
 * Twitch had a bad minute would be a far worse outcome than a header showing the login.
 */
export const fetchDisplayName = async (userId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${HELIX_USERS_URL}?id=${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${await getAppAccessToken()}`,
        "Client-Id": config.twitch.clientId,
      },
    });

    if (!response.ok) {
      const reason = await response.text().catch(() => "<unreadable>");
      Logger.warn("TwitchOAuth", `helix/users HTTP ${response.status}: ${reason.slice(0, 200)}`);
      return null;
    }

    const body = (await response.json()) as { data?: { display_name?: string }[] };
    return body.data?.[0]?.display_name || null;
  } catch (error) {
    Logger.warn("TwitchOAuth", `display name unavailable: ${String(error)}`);
    return null;
  }
};