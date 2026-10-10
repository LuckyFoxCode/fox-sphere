import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { AppError } from "./errors";

// Resolved from this file, not from process.cwd(): the repo root is a fixed
// distance from this package (dist/index.js or src/config.ts -> up three), while
// cwd depends on who started the process - a root-cwd script used to silently
// read a .env from above the repo and then throw about a missing variable.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

dotenv.config({ path: resolve(repoRoot, ".env") });

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new AppError(
      `Environment configuration error: Variable [${key}] is missing or empty in .env`,
      500,
    );
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  debug: process.env.DEBUG === "true",
  commandPrefix: getEnv("COMMAND_PREFIX"),
  databaseUrl: getEnv("DATABASE_URL"),
  allowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:5173"),
  version: getEnv("BOT_VERSION", "dev"),

  /**
   * Twitch user id allowed to use the admin panel.
   *
   * Required, and unlike the two secrets below it is read with `getEnv`: an allowlist with
   * nothing in it has no correct fallback, so there is nothing to default it to.
   *
   * Not the same as `twitch.userId`: that one is the broadcaster the bot runs as, and in a
   * multi-tenant world the two stop being equal. Keeping them separate stops a future "tidy up"
   * from quietly widening the allowlist to whoever the bot happens to act for.
   */
  adminTwitchUserId: getEnv("ADMIN_TWITCH_USER_ID"),

  /**
   * HMAC key for the admin session cookie, or `undefined` when unset.
   *
   * Deliberately `process.env`, NOT `getEnv`, for the reason `ADMIN_KEY` was: only `apps/api`
   * reads it, and a `getEnv` here would stop the deployed Twitch bot from booting over a secret
   * it never uses. `requireSession` fails closed when it is missing, so an unset value locks the
   * routes rather than opening them.
   */
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET,

  /**
   * The exact URL Twitch redirects back to after the user authorizes.
   *
   * Must match a registered redirect URL byte for byte, including scheme and port. In dev that is
   * `http://localhost:5174/api/auth/twitch/callback` — the Vite port, not the API port, because
   * the browser only ever sees the proxy.
   */
  adminOAuthRedirectUri: process.env.ADMIN_OAUTH_REDIRECT_URI,

  twitch: {
    userId: getEnv("TWITCH_USER_ID"),
    botId: getEnv("TWITCH_BOT_ID"),
    clientId: getEnv("TWITCH_CLIENT_ID"),
    channelName: getEnv("TWITCH_CHANNEL_NAME"),
    clientSecret: getEnv("TWITCH_CLIENT_SECRET"),
    clientAccessToken: getEnv("TWITCH_STREAMER_ACCESS_TOKEN"),
    clientRefreshToken: getEnv("TWITCH_STREAMER_REFRESH_TOKEN"),
    botAccessToken: getEnv("TWITCH_BOT_ACCESS_TOKEN"),
    botRefreshToken: getEnv("TWITCH_BOT_REFRESH_TOKEN"),
  },
} as const;
