import { config, Logger } from "@fox-sphere/backend-shared";
import { TwitchAnnouncementColor } from "@fox-sphere/types";
import type { ApiClient } from "@twurple/api";
import { globalEventBus } from "../../../shared/services";
import { withLogging } from "../../../shared/utils";
import { FISHING_MESSAGES } from "../../fishing";
import { LOTTERY_MESSAGES } from "../../lottery";
import type { RewardHandler } from "../handlers";
import { BOT_MESSAGES } from "../twitch.constants";
import type { TwitchConfig } from "../twitch.types";
import type { LotteryVipRotation } from "./lottery-vip-rotation";

const LOG_CONTEXT = "ChatbotService";

export interface ChatEventListenerDeps {
  twitchConfig: TwitchConfig;
  apiClient: ApiClient;
  rewardHandlers: Map<string, RewardHandler>;
  lotteryVipRotation: LotteryVipRotation;
  sendMessage: (channel: string, message: string) => Promise<void>;
  sendAnnouncement: (
    message: string,
    color: TwitchAnnouncementColor,
  ) => Promise<void>;
}

const skipInDevelopment = (message?: string): boolean => {
  if (config.nodeEnv !== "development") return false;

  if (message !== undefined) {
    Logger.debug(LOG_CONTEXT, message);
  }

  return true;
};

export const registerChatEventListeners = (
  deps: ChatEventListenerDeps,
): void => {
  const { twitchConfig, apiClient, rewardHandlers, lotteryVipRotation } = deps;

  globalEventBus.on("lottery:ticket-earned", async (data) => {
    if (skipInDevelopment()) return;

    await withLogging(
      LOG_CONTEXT,
      `Failed to send ticket alert for ${data.username}`,
      async () => {
        const message = LOTTERY_MESSAGES.TICKET_EARNED(data.username);
        await deps.sendMessage(twitchConfig.channelName, message);
      },
    );
  });

  globalEventBus.on("fish:bite", async (data) => {
    await withLogging(
      LOG_CONTEXT,
      `Failed to send fishing bite for ${data.username}`,
      async () => {
        const message = FISHING_MESSAGES.BITE(data.username);
        await deps.sendMessage(data.channel, message);
      },
    );
  });

  globalEventBus.on("fish:expired", async (data) => {
    await withLogging(
      LOG_CONTEXT,
      `Failed to send fishing expiry for ${data.username}`,
      async () => {
        const message = FISHING_MESSAGES.EXPIRED(data.username);
        await deps.sendMessage(data.channel, message);
      },
    );
  });

  globalEventBus.on("lottery:no-participants", async (data) => {
    await withLogging(
      LOG_CONTEXT,
      "Failed to handle no-participants cleanup",
      async () => {
        await lotteryVipRotation.removeVipFromUsers(data.oldWinners);
        await deps.sendMessage(
          twitchConfig.channelName,
          LOTTERY_MESSAGES.LOTTERY_POSTPONED_NO_PARTICIPANTS,
        );
      },
    );
  });

  globalEventBus.on("lottery:winners", async (data) => {
    await withLogging(LOG_CONTEXT, `Failed to send winners alert`, async () => {
      await lotteryVipRotation.handleWinners(data);
    });
  });

  globalEventBus.on("stream:level-up", async (data) => {
    if (skipInDevelopment(`💤[DEV] Skipped stream level-up: Level ${data.lvl}`)) {
      return;
    }

    await withLogging(
      LOG_CONTEXT,
      `Failed to send level-up message to chat`,
      async () => {
        const message = BOT_MESSAGES.ALERTS.LEVEL_UP_STREAM(data.lvl);
        await deps.sendMessage(twitchConfig.channelName, message);
      },
    );
  });

  globalEventBus.on("user:level-up", async (data) => {
    if (skipInDevelopment(`💤[DEV] Skipped auto level-up for ${data.username}`)) {
      return;
    }

    await withLogging(
      LOG_CONTEXT,
      `Failed to send level-up message for ${data.username}`,
      async () => {
        const message = BOT_MESSAGES.ALERTS.LEVEL_UP_USER(
          data.username,
          data.newLevel,
        );
        await deps.sendMessage(twitchConfig.channelName, message);
      },
    );
  });

  globalEventBus.on("twitch:follow", async (data) => {
    if (
      skipInDevelopment(
        `💤[DEV] Skipped auto follow announcement for @${data.username}`,
      )
    ) {
      return;
    }

    await withLogging(
      LOG_CONTEXT,
      `Failed to send follow alert message for user: ${data.username}`,
      async () => {
        const message = BOT_MESSAGES.ALERTS.FOLLOW(data.username);
        await deps.sendMessage(twitchConfig.channelName, message);
      },
    );
  });

  globalEventBus.on("twitch:raid", async (data) => {
    await withLogging(
      LOG_CONTEXT,
      `Failed to send raid alert message for streamer: ${data.raiderName}`,
      async () => {
        const message = BOT_MESSAGES.ALERTS.RAID(data.raiderName, data.viewers);
        await deps.sendAnnouncement(message, "purple");
        await apiClient.asUser(config.twitch.botId, async (ctx) => {
          await ctx.chat.shoutoutUser(config.twitch.userId, data.raiderId);
        });
      },
    );
  });

  globalEventBus.on("twitch:reward-redeem", async (data) => {
    const handler = rewardHandlers.get(data.rewardTitle);

    if (!handler) {
      Logger.debug(
        LOG_CONTEXT,
        `No handler registered for reward: ${data.rewardTitle}`,
      );
      return;
    }

    await withLogging(
      LOG_CONTEXT,
      `Error executing reward handler for: ${data.rewardTitle}`,
      async () => {
        await handler.execute({
          userId: data.userId,
          username: data.username,
          redemptionId: data.redemptionId,
        });
      },
    );
  });
};
