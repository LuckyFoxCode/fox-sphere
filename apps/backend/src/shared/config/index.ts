import "dotenv/config";

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`❌ Ошибка окружения: Переменная ${key} не задана в .env`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: getEnv("DATABASE_URL"),

  twitch: {
    userId: getEnv("TWITCH_USER_ID"),
    clientId: getEnv("TWITCH_CLIENT_ID"),
    channelName: getEnv("TWITCH_CHANNEL_NAME"),
    clientSecret: getEnv("TWITCH_CLIENT_SECRET"),
    botAccessToken: getEnv("TWITCH_BOT_ACCESS_TOKEN"),
    botRefreshToken: getEnv("TWITCH_BOT_REFRESH_TOKEN"),
  },
} as const;
