import { Logger, prisma } from "@fox-sphere/backend-shared";
import { LotteryUserDto, TwitchAnnouncementColor } from "@fox-sphere/types";
import type { ApiClient } from "@twurple/api";
import { globalEventBus } from "../../../shared/services";
import { delay } from "../../../shared/utils";
import { LOTTERY_DELAYS, LOTTERY_MESSAGES } from "../../lottery";
import type { TwitchConfig } from "../twitch.types";

export interface LotteryVipRotationDeps {
  apiClient: ApiClient;
  twitchConfig: TwitchConfig;
  sendMessage: (channel: string, message: string) => Promise<void>;
  sendAnnouncement: (
    message: string,
    color: TwitchAnnouncementColor,
  ) => Promise<void>;
}

export interface LotteryWinnersInput {
  oldWinners: LotteryUserDto[];
  newWinners: LotteryUserDto[];
}

/**
 * Runs the weekly VIP rotation: strips last week's winners, then hands the slot
 * out one place at a time with a pause between each so the chat reads it in order.
 *
 * It takes `sendMessage` / `sendAnnouncement` as callbacks rather than reaching
 * for `ChatbotService`, because that service is the thing wiring this up — a
 * direct import would close a cycle back through the listener registration.
 */
export class LotteryVipRotation {
  private readonly apiClient: ApiClient;
  private readonly twitchConfig: TwitchConfig;
  private readonly sendMessage: (
    channel: string,
    message: string,
  ) => Promise<void>;
  private readonly sendAnnouncement: (
    message: string,
    color: TwitchAnnouncementColor,
  ) => Promise<void>;

  constructor(deps: LotteryVipRotationDeps) {
    this.apiClient = deps.apiClient;
    this.twitchConfig = deps.twitchConfig;
    this.sendMessage = deps.sendMessage;
    this.sendAnnouncement = deps.sendAnnouncement;
  }

  public async handleWinners({
    oldWinners,
    newWinners,
  }: LotteryWinnersInput): Promise<void> {
    const channelId = this.twitchConfig.userId;
    const channelName = this.twitchConfig.channelName;

    Logger.info(
      "ChatbotService",
      "Начался процесс ротации лотерейных VIP-статусов...",
    );

    await this.removeVipFromUsers(oldWinners, newWinners);

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
  }

  public async removeVipFromUsers(
    oldWinners: LotteryUserDto[],
    newWinners: LotteryUserDto[] = [],
  ): Promise<void> {
    const channelId = this.twitchConfig.userId;

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
}
