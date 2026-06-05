import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { globalEventBus } from "../../shared/services/event-bus.service";
import { Logger } from "../../shared/services/logger.service";
import {
  CoinExchangeHandler,
  LeaderboardHandler,
  RewardHandler,
  StatsHandler,
} from "./handlers";
import {
  AnnouncementService,
  CommandRegisry,
  TwitchActivityService,
} from "./services";
import { COOLDOWNS } from "./twitch.constants";
import { AnnouncementColor, TwitchConfig } from "./twitch.types";
import { UserService } from "./user.service";

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;
  private activityService: TwitchActivityService;
  private commandRegistry: CommandRegisry;
  private announcementService: AnnouncementService;

  private rewardHandlers = new Map<string, RewardHandler>();

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
    private twitchConfig: TwitchConfig,
  ) {
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
    this.activityService = new TwitchActivityService(
      this.apiClient,
      this.userService,
      this.twitchConfig,
    );
    this.commandRegistry = new CommandRegisry(this, this.userService);
    this.announcementService = new AnnouncementService(
      this.apiClient,
      this.twitchConfig,
    );
  }

  public async start(): Promise<void> {
    this.registerRewardHandler();

    try {
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [this.twitchConfig.channelName],
      });

      this.setupGlobalEventListers();
      this.setupChatClientListeners();

      this.chatClient.connect();

      Logger.info(
        "ChatbotService",
        "Chatbot successfully connected to Twitch!🚀",
      );

      setInterval(() => {
        this.userService.clearCache();
      }, COOLDOWNS.CACHE_CLEAR_INTERVAL);
    } catch (error) {
      Logger.error(
        "ChatbotService",
        "Failed to start Twitch chatbot connection",
        error,
      );
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.chatClient) {
      await this.chatClient.quit();
    }
  }

  private registerRewardHandler(): void {
    const coinExchange = new CoinExchangeHandler(this, this.userService);
    const leaderboard = new LeaderboardHandler(
      this,
      this.userService,
      this.twitchConfig,
    );
    const stats = new StatsHandler(this, this.userService, this.twitchConfig);

    this.rewardHandlers.set(coinExchange.rewardTitle, coinExchange);
    this.rewardHandlers.set(leaderboard.rewardTitle, leaderboard);
    this.rewardHandlers.set(stats.rewardTitle, stats);
  }

  private setupGlobalEventListers(): void {
    globalEventBus.on("user:level-up", async (data) => {
      try {
        await this.sendMessage(
          this.twitchConfig.channelName,
          `⚡ @${data.username} leveled up to Level ${data.newLevel}! 🚀 GG!`,
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
          this.twitchConfig.channelName,
          `🎉 Thanks for the follow, @${data.username}! Welcome to the Foxsphere family! 🚀`,
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
      const handler = this.rewardHandlers.get(data.rewardTitle);

      if (handler) {
        try {
          await handler.execute({
            userId: data.userId,
            username: data.username,
          });
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Error executing reward handler for: ${data.rewardTitle}`,
            error,
          );
        }
      } else {
        Logger.debug(
          "ChatbotService",
          `No handler registered for reward: ${data.rewardTitle}`,
        );
      }
    });
  }

  private setupChatClientListeners(): void {
    this.chatClient.onMessage(async (channel, user, text, msg) => {
      Logger.debug("ChatbotService", `[${channel}] ${user}: ${text}`);

      await this.activityService.trackActivity(user, msg);
      await this.commandRegistry.execute(channel, user, text, msg);
    });
  }

  public async sendMessage(channel: string, message: string): Promise<void> {
    if (this.chatClient) {
      await this.chatClient.say(channel, message);
    }
  }

  public async sendAnnouncement(
    message: string,
    color: AnnouncementColor = "blue",
  ): Promise<void> {
    try {
      await this.announcementService.enqueue(message, color);
    } catch (error) {
      Logger.error(
        "ChatbotService",
        `Failed to enqueue announcement: "${message}"`,
        error,
      );

      await this.sendMessage(this.twitchConfig.channelName, message);
    }
  }
}
