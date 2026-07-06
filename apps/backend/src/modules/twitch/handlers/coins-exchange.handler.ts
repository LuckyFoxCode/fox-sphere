import { Logger } from "../../../shared/services";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import {
  BOT_MESSAGES,
  COINS_EXCHANGE_AMOUNT,
  REWARD_TITLES,
} from "../twitch.constants";
import { RewardContext, RewardHandler } from "./reward.interface";

export class CoinExchangeHandler implements RewardHandler {
  readonly rewardTitle = REWARD_TITLES.COIN_EXCHANGE;

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: RewardContext): Promise<void> {
    try {
      await this.userService.addCoins(ctx.userId, COINS_EXCHANGE_AMOUNT);
      const message = BOT_MESSAGES.REWARDS.COIN_EXCHANGE(
        ctx.username,
        COINS_EXCHANGE_AMOUNT,
      );
      await this.chatbotService.sendAnnouncement(message, "green");

      Logger.info(
        "ChatbotService",
        `Successfully processed coin exchange for ${ctx.username}`,
      );
    } catch (error) {
      Logger.error(
        "CoinExchangeHandler",
        `Failed to process reward exchange for user: ${ctx.username}`,
        error,
      );
    }
  }
}
