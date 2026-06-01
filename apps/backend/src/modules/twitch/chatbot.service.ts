import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";
import { globalEventBus } from "../../shared/services/event-bus.service.js";
import { Logger } from "../../shared/services/logger.service.js";
import { UserService } from "./user.service.js";

type AnnouncementColor = "blue" | "green" | "orange" | "purple" | "primary";

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;

  private announcementQueue: Array<{
    message: string;
    color: AnnouncementColor;
  }> = [];
  private isProcessingQueue = false;

  private coinsCommandCooldown = new Set<string>();

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
            config.twitch.channelName,
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
        try {
          if (data.rewardTitle === "Flex Leaderboard") {
            const topUsers = await this.userService.getTopUsers(5);

            if (topUsers.length === 0) {
              await this.sendMessage(
                config.twitch.channelName,
                "📋 Leaderboard is currently empty.",
              );
              return;
            }

            const markers = ["👑 1st", "⭐ 2nd", "✨ 3rd", "🔹 4th", "🔹 5th"];
            const topList = topUsers
              .map((user, index) => {
                const prefix = markers[index] || `${index + 1}th`;
                return `${prefix} @${user.username} (Lvl ${user.lvl}, ${user.xp} XP)`;
              })
              .join("   |   ");

            await this.sendAnnouncement(
              `🏆 LEADERBOARD (Ordered by @${data.username}) 🏆   ➔   ${topList}`,
              "purple",
            );
          }

          if (data.rewardTitle === "Check My Stats") {
            const userData = await this.userService.getUsersStats(data.userId);

            if (!userData) {
              await this.sendMessage(
                config.twitch.channelName,
                `@${data.username}, you are not registered in the system yet.`,
              );
              return;
            }

            const xpForNextLevel = userData.lvl * 100;

            await this.sendAnnouncement(
              `✨ @${data.username}'s STATS:   ⭐ Level: ${userData.lvl}   🛡️   XP: ${userData.xp} / ${xpForNextLevel}   🚀`,
              "orange",
            );
          }

          if (data.rewardTitle === "Coin Exchange") {
            try {
              const coinsAmount = 10;

              await this.userService.addCoins(data.userId, coinsAmount);

              await this.sendAnnouncement(
                `💰 @${data.username} exchanged Channel Points for ${coinsAmount} Coins! Wallet updated! 🪙`,
                "green",
              );

              Logger.info(
                "ChatbotService",
                `Successfully processed coin exchange for ${data.username}`,
              );
            } catch (error) {
              Logger.error(
                "ChatbotService",
                `Failed to process reward exchange for user: ${data.username}`,
                error,
              );
            }
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
        await this.sendMessage(channel, `@${user}, pong!`);
      }

      if (text.startsWith("!coins")) {
        const twitchId = msg.userInfo.userId;

        if (this.coinsCommandCooldown.has(twitchId)) {
          Logger.debug(
            "ChatbotService",
            `Ignored !coins spam from user: ${user}`,
          );
          return;
        }

        try {
          const coins = await this.userService.getUserCoins(twitchId);

          await this.sendMessage(
            channel,
            `💰 Wallet • @${user} ➔ ${coins} Coins 🪙`,
          );

          this.coinsCommandCooldown.add(twitchId);
          setTimeout(() => {
            this.coinsCommandCooldown.delete(twitchId);
          }, 5000);
        } catch (error) {
          Logger.error(
            "ChatbotService",
            `Failed to execute !coins command for user: ${user}`,
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
          await this.apiClient.asUser(config.twitch.botId, async (ctx) => {
            await ctx.chat.sendAnnouncement(config.twitch.userId, {
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
          await this.sendMessage(config.twitch.channelName, current.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    this.isProcessingQueue = false;
    Logger.debug(
      "ChatbotService",
      "Announcement queue is now empty. Conveyor stopped.",
    );
  }
}
