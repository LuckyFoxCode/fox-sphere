import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";
import { prisma } from "../../shared/lib/prisma.js";

export class ChatbotService {
  private chatClient!: ChatClient;
  private authProvider!: RefreshingAuthProvider;

  constructor() {
    this.authProvider = new RefreshingAuthProvider({
      clientId: config.twitch.clientId,
      clientSecret: config.twitch.clientSecret,
    });

    this.authProvider.onRefresh(async (userId, tokenData) => {
      try {
        await prisma.twitchToken.update({
          where: { twitchUserId: userId },
          data: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken || undefined,
            expiresIn: tokenData.expiresIn ?? 0,
            obtainmentTimestamp: tokenData.obtainmentTimestamp,
          },
        });
        console.log(
          `[Twitch Auth] Токены для пользователя ${userId} успешно обновлены в базе данных. ✅`,
        );
      } catch (error) {
        console.error(
          "❌ Ошибка при сохранении обновленного токена в БД:",
          error,
        );
      }
    });
  }

  public async start(): Promise<void> {
    try {
      const tokenRecord = await prisma.twitchToken.findFirst();

      if (!tokenRecord) {
        throw new Error(
          "В базе данных нет токенов Twitch! Сначала нужно добавить стартовую запись.",
        );
      }

      this.authProvider.addUser(
        tokenRecord.twitchUserId,
        {
          accessToken: tokenRecord.accessToken,
          refreshToken: tokenRecord.refreshToken ?? undefined,
          expiresIn: tokenRecord.expiresIn,
          obtainmentTimestamp: Number(tokenRecord.obtainmentTimestamp),
          scope: ["chat:read", "chat:edit"],
        },
        ["chat"],
      );

      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [config.twitch.channelName],
      });

      this.chatClient.onMessage((channel, user, text, _msg) => {
        console.log(`[${channel}] ${user}: ${text}`);

        if (text.startsWith("!ping")) {
          this.chatClient.say(channel, `@${user}, pong!`);
        }
      });

      this.chatClient.connect();
      console.log("🚀 Чат-бот успешно подключился к Twitch!");
    } catch (error) {
      console.error("❌ Ошибка подключения бота:", error);
      throw error;
    }
  }
}
