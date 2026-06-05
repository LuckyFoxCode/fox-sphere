import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { globalEventBus } from "../../shared/services/event-bus.service";
import { Logger } from "../../shared/services/logger.service";
import { COOLDOWNS as USER_COOLDOWNS, UserService } from "../user";
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
import { BOT_MESSAGES } from "./twitch.constants";
import { AnnouncementColor, TwitchConfig } from "./twitch.types";

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
      }, USER_COOLDOWNS.CACHE_CLEAR_INTERVAL);
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
        const message = BOT_MESSAGES.ALERTS.LEVEL_UP(
          data.username,
          data.newLevel,
        );
        await this.sendMessage(this.twitchConfig.channelName, message);
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
        const message = BOT_MESSAGES.ALERTS.FOLLOW(data.username);
        await this.sendMessage(this.twitchConfig.channelName, message);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Failed to send follow alert message for user: ${data.username}`,
          error,
        );
      }
    });

    globalEventBus.on("twitch:raid", async (data) => {
      try {
        const message = BOT_MESSAGES.ALERTS.RAID(data.raiderName, data.viewers);
        await this.sendAnnouncement(message, "purple");
        await this.sendMessage(
          this.twitchConfig.channelName,
          `/shoutout ${data.raiderName}`,
        );
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Failed to send raid alert message for streamer: ${data.raiderName}`,
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
