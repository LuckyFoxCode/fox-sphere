import { prisma } from "./shared/lib";
import { Logger } from "./shared/services";

async function main() {
  Logger.info("TokenReset", "Starting forced database tables cleanup... 🧹");

  const result = await prisma.twitchToken.deleteMany({});

  Logger.info(
    "TokenReset",
    `Successfully deleted ${result.count} records from twitch_tokens table! 🎉`,
  );
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
