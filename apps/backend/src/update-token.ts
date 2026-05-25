import { config } from "./shared/config/index.js";
import { prisma } from "./shared/lib/prisma.js";

async function main() {
  const NEW_ACCESS_TOKEN = config.twitch.botAccessToken;
  const NEW_REFRESH_TOKEN = config.twitch.botRefreshToken;

  const token = await prisma.twitchToken.findFirst();

  if (token) {
    await prisma.twitchToken.update({
      where: { twitchUserId: token.twitchUserId },
      data: {
        accessToken: NEW_ACCESS_TOKEN,
        refreshToken: NEW_REFRESH_TOKEN,
        obtainmentTimestamp: Date.now(),
        expiresIn: 14400,
      },
    });
    console.log("✅ Токены успешно принудительно обновлены в БД!");
  } else {
    console.log("❌ Записей не найдено. Создаем новую...");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
