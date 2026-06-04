import { ApiClient } from "@twurple/api";
import { ChatMessage } from "@twurple/chat";
import { Logger } from "../../../shared/services/logger.service";
import { TwitchConfig } from "../chatbot.service";
import { XP_REWARDS } from "../twitch.constants";
import { UserService } from "../user.service";

export class TwitchActivityService {
  private followersCache = new Set<string>();

  constructor(
    private apiClient: ApiClient,
    private userService: UserService,
    private twitchConfig: TwitchConfig,
  ) {}

  public async trackActivity(
    username: string,
    msg: ChatMessage,
  ): Promise<void> {
    const twitchId = msg.userInfo.userId;

    try {
      await this.userService.findOrCreateUser(twitchId, username);

      if (!this.followersCache.has(twitchId)) {
        try {
          const followCheck = await this.apiClient.asUser(
            this.twitchConfig.botId,
            async (ctx) => {
              return await ctx.channels.getChannelFollowers(
                this.twitchConfig.userId,
                twitchId,
              );
            },
          );

          if (followCheck.data.length > 0) {
            this.followersCache.add(twitchId);
          }
        } catch (error) {
          Logger.error(
            "TwitchActivityService",
            `Failed to check Twitch follow status for ${username}`,
            error,
          );
        }
      }

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
        "TwitchActivityService",
        `Failed to track activity for user: ${username}`,
        error,
      );
    }
  }
}
