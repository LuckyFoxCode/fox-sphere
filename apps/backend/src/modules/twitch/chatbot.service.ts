import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";
import { globalEventBus } from "../../shared/services/event-bus.service.js";
import { Logger } from "../../shared/services/logger.service.js";
import { UserService } from "./user.service.js";

export class ChatbotService {
  private chatClient!: ChatClient;

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
  ) {}

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
            `/announceorange @${data.username} повысил свой уровень до ${data.newLevel}! 🚀 GG!`,
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
            `/announcegreen 🎉 Спасибо за фоллов, @${data.username}! Добро пожаловать в семью!`,
          );
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to send follow alert message for user: ${data.username}`,
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
}
