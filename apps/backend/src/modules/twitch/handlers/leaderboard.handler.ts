import { Logger } from "../../../shared/services/logger.service";
import { ChatbotService, TwitchConfig } from "../chatbot.service";
import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_MARKERS,
  REWARD_TITLES,
} from "../twitch.constants";
import { UserService } from "../user.service";
import { RewardContext, RewardHandler } from "./reward.interface";

export class LeaderboardHandler implements RewardHandler {
  readonly rewardTitle = REWARD_TITLES.LEADERBOARD;

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private twitchConfig: TwitchConfig,
  ) {}

  async execute(ctx: RewardContext): Promise<void> {
    try {
      const topUsers = await this.userService.getTopUsers(LEADERBOARD_LIMIT);

      if (topUsers.length === 0) {
        await this.chatbotService.sendMessage(
          this.twitchConfig.channelName,
          "📋 Leaderboard is currently empty.",
        );
        return;
      }

      const topList = topUsers
        .map((user, index) => {
          const prefix = LEADERBOARD_MARKERS[index] || `${index + 1}th`;
          return `${prefix} @${user.username} (Lvl ${user.lvl}, ${user.xp} XP)`;
        })
        .join("   |   ");

      await this.chatbotService.sendAnnouncement(
        `🏆 LEADERBOARD (Ordered by @${ctx.username}) 🏆   ➔   ${topList}`,
        "purple",
      );

      Logger.debug(
        "LeaderboardHandler",
        `Successfully displayed leaderboard for @${ctx.username}`,
      );
    } catch (error) {
      Logger.error(
        "LeaderboardHandler",
        `Failed to execute leaderboard reward for user: ${ctx.username}`,
        error,
      );

      await this.chatbotService.sendMessage(
        this.twitchConfig.channelName,
        `⚠ @${ctx.username}, не удалось загрузить лидерборд из-за ошибки на бэкенде. Попробуй позже!`,
      );
    }
  }
}
