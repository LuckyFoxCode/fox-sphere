import {
  LotteryUserDto,
  TwitchAnnouncementColor,
  TwitchChatMessagePayload,
} from "@fox-sphere/types";
import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { randomUUID } from "node:crypto";
import { config } from "../../shared/config";
import { prisma } from "../../shared/lib";
import { globalEventBus } from "../../shared/services/event-bus.service";
import { Logger } from "../../shared/services/logger.service";
import { LOTTERY_DELAYS, LOTTERY_MESSAGES } from "../lottery";
import { StreamService } from "../stream";
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
  TwitchBadgeService,
} from "./services";
import { BOT_MESSAGES } from "./twitch.constants";
import { TwitchConfig } from "./twitch.types";

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;
  private activityService: TwitchActivityService;
  private badgeService!: TwitchBadgeService;
  private commandRegistry: CommandRegisry;
  private announcementService: AnnouncementService;
  private botUsername = "";
  private botDisplayName = "";
  private botColor = "#94A3B8";
  private isBotMod = false;
  private botBadges: string[] = [];

  private rewardHandlers = new Map<string, RewardHandler>();

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
    private streamService: StreamService,
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
      this.streamService,
      this.apiClient,
    );
    this.announcementService = new AnnouncementService(
      this.apiClient,
      this.twitchConfig,
      (message, color) =>
        this.emitBotMessage(message, {
          isAnnouncement: true,
          announceColor: color,
        }),
    );
    this.badgeService = new TwitchBadgeService(
      this.apiClient,
      twitchConfig.userId,
    );
  }

  public async start(): Promise<void> {
    this.registerRewardHandler();

    try {
      await this.badgeService.init();
      await this.initBotIdentity();

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

  private async initBotIdentity(): Promise<void> {
    try {
      const botUser = await this.apiClient.asUser(config.twitch.botId, (ctx) =>
        ctx.users.getUserById(config.twitch.botId),
      );

      if (!botUser) {
        Logger.error("ChatbotService", "Bot user not found on Twitch");
        return;
      }

      this.botUsername = botUser.name;
      this.botDisplayName = botUser.displayName;

      await this.userService.findOrCreateUser(
        config.twitch.botId,
        this.botUsername,
      );

      try {
        this.botColor =
          (await this.apiClient.chat.getColorForUser(config.twitch.botId)) ??
          "#94A3B8";

        const moderators = await this.apiClient.moderation.getModerators(
          this.twitchConfig.userId,
          { userId: config.twitch.botId },
        );
        this.isBotMod = moderators.data.length > 0;

        const rawBadges: Record<string, string> = {};
        if (this.isBotMod) rawBadges.moderator = "1";
        this.botBadges = this.badgeService.getBadgeUrls(rawBadges);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          "Failed to fetch bot chat identity details, using defaults",
          error,
        );
      }

      Logger.info(
        "ChatbotService",
        `Bot identity ready: ${this.botDisplayName}`,
      );
    } catch (error) {
      Logger.error(
        "ChatbotService",
        "Failed to initialize bot identity",
        error,
      );
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

    globalEventBus.on("stream:level-up", async (data) => {
      try {
        const message = BOT_MESSAGES.ALERTS.LEVEL_UP_STREAM(data.lvl);
        await this.sendMessage(this.twitchConfig.channelName, message);
      } catch (error) {
        Logger.error(
          "ChatbotService",
          `Failed to send level-up message to chat`,
          error,
        );
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
        const message = BOT_MESSAGES.ALERTS.LEVEL_UP_USER(
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
      try {
        Logger.debug("ChatbotService", `[${channel}] ${user}: ${text}`);
        const twitchId = msg.userInfo.userId;

        await this.activityService.trackActivity(user, msg);
        await this.commandRegistry.execute(channel, user, text, msg);

        const userData = await this.userService.getUserWithPokemon(
          msg.userInfo.userId,
        );
        const isFollower = this.activityService.isFollower(twitchId);

        const emotes: Record<string, string[]> = Object.fromEntries(
          msg.emoteOffsets,
        );
        const rawBadges: Record<string, string> = Object.fromEntries(
          msg.userInfo.badges,
        );

        const badgeUrls = this.badgeService.getBadgeUrls(rawBadges);

        const chatMessagePayload: TwitchChatMessagePayload = {
          id: msg.id,
          userId: msg.userInfo.userId,
          username: user,
          displayName: msg.userInfo.displayName,
          color: msg.userInfo.color || "#9146FF",
          text,
          badges: badgeUrls,
          emotes,
          timestamp: msg.date.getTime(),
          userLvl: userData?.lvl ?? 1,
          isFollower,
          pokemon: userData?.pokemon,
          isMod: msg.userInfo.isMod,
          isSubscriber: msg.userInfo.isSubscriber,
          isVip: msg.userInfo.isVip,
          isBroadcaster: msg.userInfo.isBroadcaster,
          isBot: msg.userInfo.userId === config.twitch.botId,
          isPermanentVip: userData?.isPermanentVip ?? false,
          isFounder: userData?.isFounder ?? false,
          isHighlight: msg.isHighlight,
        };

        globalEventBus.emit("chat:message", chatMessagePayload);
      } catch (error) {
        Logger.error("ChatbotService", "Error processing chat message", error);
      }
    });

    this.chatClient.onViewerMilestone(
      async (channel, user, milestoneInfo, msg) => {
        try {
          Logger.debug(
            "ChatbotService",
            `[${channel}] Watch streak by ${user}`,
          );

          const userData = await this.userService.getUserWithPokemon(
            msg.userInfo.userId,
          );
          const isFollower = this.activityService.isFollower(
            msg.userInfo.userId,
          );

          const emotes: Record<string, string[]> = Object.fromEntries(
            msg.emoteOffsets,
          );
          const rawBadges: Record<string, string> = Object.fromEntries(
            msg.userInfo.badges,
          );
          const badgeUrls = this.badgeService.getBadgeUrls(rawBadges);

          const chatMessagePayload: TwitchChatMessagePayload = {
            id: msg.id,
            userId: msg.userInfo.userId,
            username: user,
            displayName: msg.userInfo.displayName,
            color: msg.userInfo.color || "#9146FF",
            text: milestoneInfo.message ?? "",
            badges: badgeUrls,
            emotes,
            timestamp: msg.date.getTime(),
            userLvl: userData?.lvl ?? 1,
            isFollower,
            pokemon: userData?.pokemon,
            isMod: msg.userInfo.isMod,
            isSubscriber: msg.userInfo.isSubscriber,
            isVip: msg.userInfo.isVip,
            isBroadcaster: msg.userInfo.isBroadcaster,
            isBot: false,
            isPermanentVip: userData?.isPermanentVip ?? false,
            isFounder: userData?.isFounder ?? false,
            isHighlight: false,
            watchStreak: {
              value: milestoneInfo.value ?? 0,
              reward: milestoneInfo.reward ?? 0,
            },
          };

          globalEventBus.emit("chat:message", chatMessagePayload);
        } catch (error) {
          Logger.error(
            "ChatbotService",
            "Error processing viewer milestone",
            error,
          );
        }
      },
    );
  }

  public async sendMessage(channel: string, message: string): Promise<void> {
    if (this.chatClient) {
      await this.chatClient.say(channel, message);
      await this.emitBotMessage(message);
    }
  }

  private async emitBotMessage(
    message: string,
    announce?: {
      isAnnouncement: boolean;
      announceColor: TwitchAnnouncementColor;
    },
  ): Promise<void> {
    try {
      const userData = await this.userService.getUserWithPokemon(
        config.twitch.botId,
      );

      const payload: TwitchChatMessagePayload = {
        id: randomUUID(),
        userId: config.twitch.botId,
        username: this.botUsername,
        displayName: this.botDisplayName || this.botUsername,
        color: this.botColor,
        text: message,
        badges: this.botBadges,
        emotes: {},
        timestamp: Date.now(),
        pokemon: userData?.pokemon,
        userLvl: userData?.lvl ?? 1,
        isMod: this.isBotMod,
        isFollower: false,
        isFounder: false,
        isSubscriber: false,
        isVip: false,
        isPermanentVip: false,
        isBroadcaster: false,
        isBot: true,
        isAnnouncement: announce?.isAnnouncement,
        announceColor: announce?.announceColor,
        isHighlight: false,
      };

      globalEventBus.emit("chat:message", payload);
    } catch (error) {
      Logger.error(
        "ChatbotService",
        "Failed to emit bot message to overlay",
        error,
      );
    }
  }

  public async sendAnnouncement(
    message: string,
    color: TwitchAnnouncementColor = "blue",
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
