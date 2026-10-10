import { config, AppError } from "@fox-sphere/backend-shared";

const AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";

/**
 * No `scope` parameter, deliberately.
 *
 * The panel needs identity and nothing else - it never reads the channel, never writes chat. A
 * scope list here would put a permissions dialog in front of every login for rights we do not
 * use. Twitch's parameter table marks `scope` as required; a Twitch developer confirmed on their
 * forum that leaving it blank works for identity confirmation, and `/validate` returns `user_id`
 * either way. If Twitch ever rejects the empty scope, this is the single line to change.
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

/**
 * One call per login, never per request.
 *
 * The alternative - handing the Twitch token to the browser and validating on every call - puts a
 * live credential in localStorage and makes the panel fail whenever Twitch is slow.
 */
export const validateToken = async (accessToken: string): Promise<{ userId: string; login: string }> => {
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
