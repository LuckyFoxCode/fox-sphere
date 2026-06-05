import { Logger } from "../../../shared/services";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import { BOT_MESSAGES, REWARD_TITLES } from "../twitch.constants";
import { TwitchConfig } from "../twitch.types";
import { RewardContext, RewardHandler } from "./reward.interface";

export class StatsHandler implements RewardHandler {
  readonly rewardTitle = REWARD_TITLES.STATS;

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private twitchConfig: TwitchConfig,
  ) {}

  async execute(ctx: RewardContext): Promise<void> {
    try {
      const userData = await this.userService.getUsersStats(ctx.userId);

      if (!userData) {
        await this.chatbotService.sendMessage(
          this.twitchConfig.channelName,
          `@${ctx.username}, you are not registered in the system yet.`,
        );
        return;
      }

      const getXpThresholdForLevel = (lvl: number): number => {
        let totalXpNeeded = 0;
        for (let i = 1; i <= lvl; i++) {
          totalXpNeeded += i * 100;
        }
        return totalXpNeeded;
      };

      const totalUserXp = userData.xp;
      const totalXpNeededForNextLevel = getXpThresholdForLevel(userData.lvl);

      const message = BOT_MESSAGES.REWARDS.USER_STATS(
        ctx.username,
        userData.lvl,
        totalUserXp,
        totalXpNeededForNextLevel,
      );
      await this.chatbotService.sendAnnouncement(message, "orange");

      Logger.debug(
        "StatsHandler",
        `Successfully displayed stats for @${ctx.username}`,
      );
    } catch (error) {
      Logger.error(
        "StatsHandler",
        `Failed to execute stats reward for user: ${ctx.username} (ID: ${ctx.userId})`,
        error,
      );

      await this.chatbotService.sendMessage(
        this.twitchConfig.channelName,
        `⚠ @${ctx.username}, произошла ошибка при запросе твоей статистики. Скоро починим!`,
      );
    }
  }
}
