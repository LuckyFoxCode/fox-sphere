import "dotenv/config";

const getEnv = (key: string, defaultValues?: string): string => {
  const value = process.env[key] || defaultValues;

  if (!value) {
    throw new Error(`❌ Ошибка окружения: Переменная ${key} не задана в .env`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: getEnv("DATABASE_URL"),
};
