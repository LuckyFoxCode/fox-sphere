import "dotenv/config";
import { AppError } from "../errors/app-error";

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
  databaseUrl: getEnv("DATABASE_URL"),
  allowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:5173"),

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
