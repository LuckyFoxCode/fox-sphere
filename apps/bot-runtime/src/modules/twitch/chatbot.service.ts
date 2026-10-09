import { config, Logger } from "@fox-sphere/backend-shared";
import {
  TwitchAnnouncementColor,
  TwitchChatMessagePayload,
} from "@fox-sphere/types";
import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient, type ChatMessage } from "@twurple/chat";
import { randomUUID } from "node:crypto";
import { globalEventBus } from "../../shared/services";
import { FishingService } from "../fishing";
import { RouletteService } from "../roulette";
import { StreamService } from "../stream";
import { COOLDOWNS as USER_COOLDOWNS, UserService } from "../user";
import {
  buildChatMessagePayload,
  LotteryVipRotation,
  registerChatEventListeners,
} from "./chat";
import {
  CoinExchangeHandler,
  LeaderboardHandler,
  RewardHandler,
  StatsHandler,
} from "./handlers";
import {
  AnnouncementService,
  CommandRegistry,
  TwitchActivityService,
  TwitchBadgeService,
} from "./services";
import { EXCHANGE_PACKAGES } from "./twitch.constants";
import { TwitchConfig } from "./twitch.types";

export class ChatbotService {
  private chatClient!: ChatClient;
  private apiClient!: ApiClient;
  private activityService: TwitchActivityService;
  private badgeService!: TwitchBadgeService;
  private commandRegistry: CommandRegistry;
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
    this.commandRegistry = new CommandRegistry(
      this,
      this.userService,
      this.streamService,
      this.apiClient,
      new RouletteService(this.userService),
      new FishingService(this.userService),
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

      this.setupChatEventListeners();
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
    for (const pkg of EXCHANGE_PACKAGES) {
      this.rewardHandlers.set(
        pkg.rewardTitle,
        new CoinExchangeHandler(this, this.userService, pkg),
      );
    }

    const leaderboard = new LeaderboardHandler(
      this,
      this.userService,
      this.twitchConfig,
    );
    const stats = new StatsHandler(this, this.userService, this.twitchConfig);

    this.rewardHandlers.set(leaderboard.rewardTitle, leaderboard);
    this.rewardHandlers.set(stats.rewardTitle, stats);
  }

  private setupChatEventListeners(): void {
    const lotteryVipRotation = new LotteryVipRotation({
      apiClient: this.apiClient,
      twitchConfig: this.twitchConfig,
      sendMessage: (channel, message) => this.sendMessage(channel, message),
      sendAnnouncement: (message, color) => this.sendAnnouncement(message, color),
    });

    registerChatEventListeners({
      twitchConfig: this.twitchConfig,
      apiClient: this.apiClient,
      rewardHandlers: this.rewardHandlers,
      lotteryVipRotation,
      sendMessage: (channel, message) => this.sendMessage(channel, message),
      sendAnnouncement: (message, color) => this.sendAnnouncement(message, color),
    });
  }

  private handleChatMessage = async (
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
    isAction: boolean,
  ): Promise<void> => {
    try {
      Logger.debug(
        "ChatbotService",
        `[${channel}] ${user}${isAction ? " (/me)" : ""}: ${text}`,
      );
      const twitchId = msg.userInfo.userId;

      await this.activityService.trackActivity(user, msg);
      await this.commandRegistry.execute(channel, user, text, msg);

      const userData = await this.userService.getUserWithHero(
        msg.userInfo.userId,
      );
      const isFollower = this.activityService.isFollower(twitchId);

      const rawBadges: Record<string, string> = Object.fromEntries(
        msg.userInfo.badges,
      );

      const badgeUrls = this.badgeService.getBadgeUrls(rawBadges);

      const chatMessagePayload: TwitchChatMessagePayload =
        buildChatMessagePayload({
          msg,
          username: user,
          text,
          isAction,
          isFollower,
          userData,
          badges: badgeUrls,
        });

      globalEventBus.emit("chat:message", chatMessagePayload);
    } catch (error) {
      Logger.error("ChatbotService", "Error processing chat message", error);
    }
  };

  private setupChatClientListeners(): void {
    this.chatClient.onMessage((channel, user, text, msg) =>
      this.handleChatMessage(channel, user, text, msg, false),
    );
    this.chatClient.onAction((channel, user, text, msg) =>
      this.handleChatMessage(channel, user, text, msg, true),
    );

    this.chatClient.onViewerMilestone(
      async (channel, user, milestoneInfo, msg) => {
        try {
          Logger.debug(
            "ChatbotService",
            `[${channel}] Watch streak by ${user}`,
          );

          const userData = await this.userService.getUserWithHero(
            msg.userInfo.userId,
          );
          const isFollower = this.activityService.isFollower(
            msg.userInfo.userId,
          );

          const rawBadges: Record<string, string> = Object.fromEntries(
            msg.userInfo.badges,
          );
          const badgeUrls = this.badgeService.getBadgeUrls(rawBadges);

          const chatMessagePayload: TwitchChatMessagePayload =
            buildChatMessagePayload({
              msg,
              username: user,
              text: milestoneInfo.message ?? "",
              isAction: false,
              isFollower,
              userData,
              badges: badgeUrls,
              isBot: false,
              isHighlight: false,
              watchStreak: {
                value: milestoneInfo.value ?? 0,
                reward: milestoneInfo.reward ?? 0,
              },
            });

          globalEventBus.emit("chat:message", chatMessagePayload);

          const awardResult = await this.userService.awardWatchStreak(
            msg.userInfo.userId,
            milestoneInfo.value ?? 0,
          );

          if (awardResult) {
            globalEventBus.emit("twitch:watch-streak", {
              userId: msg.userInfo.userId,
              username: user,
              displayName: msg.userInfo.displayName,
              streakValue: milestoneInfo.value ?? 0,
              xpAwarded: awardResult.xpAwarded,
              coinsAwarded: awardResult.coinsAwarded,
              isRepeat: awardResult.isRepeat,
            });
          }
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
      const userData = await this.userService.getUserWithHero(
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
        hero: userData?.hero,
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
        isAction: false,
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
