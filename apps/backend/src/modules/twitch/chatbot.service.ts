import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { globalEventBus } from "../../shared/services/event-bus.service";
import { Logger } from "../../shared/services/logger.service";
import { TwitchCommand } from "./commands/command.interface";
import { CoinsCommand } from "./commands/economy";
import { PingCommand } from "./commands/general";
import {
  CoinExchangeHandler,
  LeaderboardHandler,
  RewardHandler,
  StatsHandler,
} from "./handlers";
import { COOLDOWNS, XP_REWARDS } from "./twitch.constants";
import { UserService } from "./user.service";

type AnnouncementColor = "blue" | "green" | "orange" | "purple" | "primary";

export interface TwitchConfig {
  botId: string;
  userId: string;
  channelName: string;
}

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;

  private announcementQueue: Array<{
    message: string;
    color: AnnouncementColor;
  }> = [];
  private isProcessingQueue = false;

  private followersCache = new Set<string>();
  private commands = new Map<string, TwitchCommand>();
  private rewardHandlers = new Map<string, RewardHandler>();

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
    private twitchConfig: TwitchConfig,
  ) {
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
  }

  public async start(): Promise<void> {
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

    try {
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [this.twitchConfig.channelName],
      });

      this.registerCommands();

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
          this.followersCache.add(data.userId);

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

  private registerCommands(): void {
    const pingCmd = new PingCommand(this);
    const coinsCmd = new CoinsCommand(this, this.userService);

    this.commands.set(pingCmd.name, pingCmd);
    this.commands.set(coinsCmd.name, coinsCmd);

    this.chatClient.onMessage(async (channel, user, text, msg) => {
      Logger.debug("ChatbotService", `[${channel}] ${user}: ${text}`);

      try {
        const twitchId = msg.userInfo.userId;

        await this.userService.findOrCreateUser(twitchId, user);

        let xpAmount: number = XP_REWARDS.DEFAULT;

        if (msg.userInfo.isBroadcaster) {
          xpAmount = XP_REWARDS.BROADCASTER;
        } else if (msg.userInfo.isSubscriber) {
          xpAmount = XP_REWARDS.SUBSCRIBER;
        } else if (this.followersCache.has(twitchId)) {
          xpAmount = XP_REWARDS.FOLLOWER;
        }

        await this.userService.addXpForMessage(twitchId, xpAmount);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Chat auto-registration failed for user: ${user}`,
          error,
        );
      }

      if (!text.startsWith("!")) return;

      const args = text.slice(1).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      const command = this.commands.get(commandName);

      if (command) {
        try {
          await command.execute({ channel, user, text, msg });
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Error executing !${commandName}`,
            error,
          );
        }
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
    color: AnnouncementColor = "blue",
  ): Promise<void> {
    this.announcementQueue.push({ message, color });
    Logger.debug(
      "ChatbotService",
      `Announcement added to queue. Queue length: ${this.announcementQueue.length}`,
    );

    this.processAnnouncementQueue();
  }

  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const current = this.announcementQueue.shift();

      if (current) {
        try {
          await this.apiClient.asUser(this.twitchConfig.botId, async (ctx) => {
            await ctx.chat.sendAnnouncement(this.twitchConfig.userId, {
              message: current.message,
              color: current.color,
            });
          });
          Logger.debug(
            "ChatbotService",
            `Successfully sent ${current.color} announcement from queue`,
          );
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to send Twitch announcement from queue`,
            error,
          );
          await this.sendMessage(
            this.twitchConfig.channelName,
            current.message,
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, COOLDOWNS.ANNOUNCEMENT_QUEUE),
        );
      }
    }
    this.isProcessingQueue = false;
    Logger.debug(
      "ChatbotService",
      "Announcement queue is now empty. Conveyor stopped.",
    );
  }
}
