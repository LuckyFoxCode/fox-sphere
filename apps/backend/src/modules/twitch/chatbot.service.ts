import { LotteryUserDto } from "@fox-sphere/types";
import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config";
import { prisma } from "../../shared/lib";
import { globalEventBus } from "../../shared/services/event-bus.service";
import { Logger } from "../../shared/services/logger.service";
import { LOTTERY_DELAYS, LOTTERY_MESSAGES } from "../lottery";
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
    this.commandRegistry = new CommandRegisry(
      this,
      this.userService,
      this.apiClient,
    );
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
    globalEventBus.on("lottery:ticket-earned", async (data) => {
      if (config.nodeEnv === "development") return;

      try {
        const message = LOTTERY_MESSAGES.TICKET_EARNED(data.username);
        await this.sendMessage(this.twitchConfig.channelName, message);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Failed to send ticket alert for ${data.username}`,
          error,
        );
      }
    });

    globalEventBus.on("lottery:no-participants", async (data) => {
      try {
        await this.removeVipFromUsers(data.oldWinners);
        await this.sendMessage(
          this.twitchConfig.channelName,
          LOTTERY_MESSAGES.LOTTERY_POSTPONED_NO_PARTICIPANTS,
        );
      } catch (error) {
        Logger.error(
          "ChatbotService",
          "Failed to handle no-participants cleanup",
          error,
        );
      }
    });

    globalEventBus.on("lottery:winners", async (data) => {
      try {
        const { oldWinners, newWinners } = data;
        const channelId = this.twitchConfig.userId;
        const channelName = this.twitchConfig.channelName;

        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        Logger.info(
          "ChatbotService",
          "Начался процесс ротации лотерейных VIP-статусов...",
        );

        await this.removeVipFromUsers(data.oldWinners, data.newWinners);

        await this.sendAnnouncement(
          LOTTERY_MESSAGES.START_ANNOUNCEMENT,
          "purple",
        );

        await delay(LOTTERY_DELAYS.ROTATION_PAUSE);

        for (let i = 0; i < newWinners.length; i++) {
          const winner = newWinners[i];
          const placesLeft = newWinners.length - (i + 1);

          try {
            const wasWinnerAlready = oldWinners.some(
              (ow) => ow.twitchId === winner.twitchId,
            );

            if (wasWinnerAlready) {
              Logger.info(
                "ChatbotService",
                `@${winner.username} уже имеет VIP с прошлой недели. Пропускаем запрос.`,
              );
              const message = LOTTERY_MESSAGES.REPEATED_WINNER(
                i + 1,
                winner.username,
                placesLeft,
              );
              await this.sendMessage(channelName, message);

              globalEventBus.emit("lottery:winner-drawn", {
                place: i + 1,
                username: winner.username,
                twitchId: winner.twitchId,
              });

              if (placesLeft > 0) await delay(LOTTERY_DELAYS.NEXT_WINNER_PAUSE);
              continue;
            }

            await this.apiClient.asUser(channelId, async (ctx) => {
              await ctx.channels.addVip(channelId, winner.twitchId);
            });

            Logger.info(
              "ChatbotService",
              `VIP успешно выдан для @${winner.username}`,
            );
            const message = LOTTERY_MESSAGES.NEW_WINNER(
              i + 1,
              winner.username,
              placesLeft,
            );
            await this.sendMessage(channelName, message);

            globalEventBus.emit("lottery:winner-drawn", {
              place: i + 1,
              username: winner.username,
              twitchId: winner.twitchId,
            });
          } catch (error) {
            Logger.error(
              "ChatbotService",
              `Ошибка при выдаче VIP для ${winner.username}`,
              error,
            );

            const message = LOTTERY_MESSAGES.ERROR_ADDING_VIP(winner.username);
            await this.sendMessage(channelName, message);
          }

          if (placesLeft > 0) {
            await delay(LOTTERY_DELAYS.NEXT_WINNER_PAUSE);
          }
        }

        await delay(LOTTERY_DELAYS.FINAL_PAUSE);

        await this.sendAnnouncement(
          LOTTERY_MESSAGES.FINAL_ANNOUNCEMENT,
          "purple",
        );
        globalEventBus.emit("lottery:finished", { winners: newWinners });
      } catch (error) {
        Logger.error("ChatbotService", `Failed to send winners alert`, error);
      }
    });

    globalEventBus.on("user:level-up", async (data) => {
      if (config.nodeEnv === "development") {
        Logger.debug(
          "ChatbotService",
          `💤[DEV] Скипнули авто-левел-ап для ${data.username}`,
        );
        return;
      }

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
      if (config.nodeEnv === "development") {
        Logger.debug(
          "ChatbotService",
          `💤[DEV] Скипнули авто-оповещение о фоллове для @${data.username}`,
        );
        return;
      }

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
        await this.apiClient.asUser(config.twitch.botId, async (ctx) => {
          await ctx.chat.shoutoutUser(config.twitch.userId, data.raiderId);
        });
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

  private async removeVipFromUsers(
    oldWinners: LotteryUserDto[],
    newWinners: LotteryUserDto[] = [],
  ) {
    const channelId = this.twitchConfig.userId;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (const oldWinner of oldWinners) {
      try {
        const currentDbUser = await prisma.user.findUnique({
          where: { twitchId: oldWinner.twitchId },
        });

        if (currentDbUser?.isPermanentVip) {
          Logger.debug(
            "ChatbotService",
            `Пропускаем снятие VIP с перманентного пользователя: ${oldWinner.username}`,
          );
          continue;
        }

        const isWinnerAgain = newWinners.some(
          (nw) => nw.twitchId === oldWinner.twitchId,
        );

        if (!isWinnerAgain) {
          await this.apiClient.asUser(channelId, async (ctx) => {
            await ctx.channels.removeVip(channelId, oldWinner.twitchId);
          });

          Logger.info(
            "ChatbotService",
            `Временный VIP успешно снят с @${oldWinner.username}`,
          );

          await delay(LOTTERY_DELAYS.BEFORE_START_ANNOUNCEMENT);
        }
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Не удалось снять VIP с ${oldWinner.username}`,
          error,
        );
      }
    }
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
