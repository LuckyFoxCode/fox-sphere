import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";
import { globalEventBus } from "../../shared/services/event-bus.service.js";
import { Logger } from "../../shared/services/logger.service.js";
import { UserService } from "./user.service.js";

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
  ) {
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
  }

  public async start(): Promise<void> {
    try {
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [config.twitch.channelName],
      });

      this.registerCommands();

      globalEventBus.on("user:level-up", async (data) => {
        try {
          await this.sendMessage(
            config.twitch.channelName,
            ` @${data.username} повысил свой уровень до ${data.newLevel}! 🚀 GG!`,
          );
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to send level-up message for ${data.username}`,
            error,
          );
        }
      });

      globalEventBus.on("twitch:follow", async (data) => {
        try {
          await this.sendMessage(
            config.twitch.channelName,
            ` 🎉 Спасибо за фоллов, @${data.username}! Добро пожаловать в семью!`,
          );
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to send follow alert message for user: ${data.username}`,
            error,
          );
        }
      });

      globalEventBus.on("twitch:reward-redeem", async (data) => {
        try {
          if (data.rewardTitle === "Show top-5") {
            const topUsers = await this.userService.getTopUsers(5);

            if (topUsers.length === 0) {
              await this.sendMessage(
                config.twitch.channelName,
                "📋 Список лидеров пока пуст.",
              );
              return;
            }

            const topList = topUsers
              .map(
                (user, index) =>
                  `${index + 1}. @${user.username} (${user.lvl} lvl, ${user.xp} XP)`,
              )
              .join(" | ");

            await this.sendAnnouncement(
              `/announce 🏆 ТОП ЛИДЕРОВ КАНАЛА (Заказ от @${data.username}): ${topList} 🏆`,
              "purple",
            );
          }

          if (data.rewardTitle === "My level") {
            const userData = await this.userService.getUsersStats(data.userId);

            if (!userData) {
              await this.sendMessage(
                config.twitch.channelName,
                `@${data.username}, ты еще не зарегистрирован в системе.`,
              );
              return;
            }

            let totalXpForNextLevel = 0;

            for (let i = 1; i < userData.lvl; i++) {
              totalXpForNextLevel += i * 100;
            }

            await this.sendAnnouncement(
              `🔹 @${data.username}, твоя статистика: [ Уровень: ${userData.lvl} ] | [ Опыт: ${userData.xp} / ${totalXpForNextLevel} XP ] 🚀`,
              "orange",
            );
          }
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to process channel point reward: ${data.rewardTitle}`,
            error,
          );
        }
      });

      this.chatClient.connect();
      Logger.info(
        "ChatbotService",
        "Chatbot successfully connected to Twitch!🚀",
      );

      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      setInterval(() => {
        this.userService.clearCache();
      }, TWENTY_FOUR_HOURS);
    } catch (error) {
      Logger.error(
        "ChatbotService",
        "Failed to start Twitch chatbot connection",
        error,
      );
      throw error;
    }
  }

  private registerCommands(): void {
    this.chatClient.onMessage(async (channel, user, text, msg) => {
      Logger.debug("ChatbotService", `[${channel}] ${user}: ${text}`);

      try {
        const twitchId = msg.userInfo.userId;

        await this.userService.findOrCreateUser(twitchId, user);
        await this.userService.addXpForMessage(twitchId, 5);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Chat auto-registration failed for user: ${user}`,
          error,
        );
      }

      if (text.startsWith("!ping")) {
        this.chatClient.say(channel, `@${user}, pong!`);
      }
    });
  }

  public async sendMessage(channel: string, message: string): Promise<void> {
    if (this.chatClient) {
      await this.chatClient.say(channel, message);
    }
  }

  public async sendAnnouncement(
    message: string,
    color: "blue" | "green" | "orange" | "purple" | "primary" = "blue",
  ): Promise<void> {
    try {
      await this.apiClient.asUser(config.twitch.botId, async (ctx) => {
        await ctx.chat.sendAnnouncement(config.twitch.userId, {
          message,
          color,
        });
      });
      Logger.debug(
        "ChatbotService",
        `Successfully sent ${color} announcement via ctx.chat.`,
      );
    } catch (error) {
      Logger.error(
        "ChatbotService",
        `Failed to send Twitch announcement via API`,
        error,
      );
      await this.sendMessage(config.twitch.channelName, message);
    }
  }
}
