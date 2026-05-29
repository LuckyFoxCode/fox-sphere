import { config } from "./shared/config/index.js";
import { AppError } from "./shared/errors/app-error.js";
import { prisma } from "./shared/lib/prisma.js";
import { Logger } from "./shared/services/logger.service.js";

async function main() {
  Logger.info("TokenReset", "Starting manual token override process...");
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
    Logger.info(
      "TokenReset",
      `Tokens for user ${token.twitchUserId} have been successfully forced updated in the database.`,
    );
  } else {
    Logger.error(
      "TokenReset",
      "No token records found in the database to update.",
    );
    throw new AppError("Token record not found", 404);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    Logger.error(
      "TokenReset",
      "Critical error during manual token reset execution",
      error,
    );
  });
