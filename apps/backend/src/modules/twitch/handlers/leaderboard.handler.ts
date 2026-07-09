import { Logger } from "../../../shared/services";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import {
  BOT_MESSAGES,
  LEADERBOARD_LIMIT,
  LEADERBOARD_MARKERS,
  REWARD_TITLES,
} from "../twitch.constants";
import { TwitchConfig } from "../twitch.types";
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
      const allUsers = await this.userService.getTopUsers();

      if (allUsers.length === 0) {
        await this.chatbotService.sendMessage(
          this.twitchConfig.channelName,
          "📋 Leaderboard is currently empty.",
        );
        return;
      }
      const topUsers = allUsers.slice(0, LEADERBOARD_LIMIT);

      const topList = topUsers
        .map((user, index) => {
          const prefix = LEADERBOARD_MARKERS[index] || `${index + 1}th`;
          return `${prefix} @${user.username} (Lvl ${user.lvl}, ${user.xp} XP)`;
        })
        .join("   |   ");

      let message = BOT_MESSAGES.REWARDS.LEADERBOARD(ctx.username, topList);

      const callerUsernameLower = ctx.username.toLowerCase();
      const callerIndex = allUsers.findIndex(
        (user) => user.username.toLowerCase() === callerUsernameLower,
      );

      if (callerIndex >= 0) {
        const callerUser = allUsers[callerIndex];
        const userRank = callerIndex + 1;
        const totalUsers = allUsers.length;

        message += `   |   ❖❖❖ 🏃 Your place: #${userRank} @${callerUser.username} (Lvl ${callerUser.lvl}, ${callerUser.xp} XP) out of ${totalUsers} 🎯`;
      }

      await this.chatbotService.sendAnnouncement(message, "purple");

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
