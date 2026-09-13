import { Logger } from "@fox-sphere/backend-shared";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import { BOT_MESSAGES, ExchangePackage } from "../twitch.constants";
import { RewardContext, RewardHandler } from "./reward.interface";

export class CoinExchangeHandler implements RewardHandler {
  readonly rewardTitle: string;
  private readonly pkg: ExchangePackage;

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    pkg: ExchangePackage,
  ) {
    this.pkg = pkg;
    this.rewardTitle = pkg.rewardTitle;
  }

  async execute(ctx: RewardContext): Promise<void> {
    const result = await this.userService.exchangeChannelPoints(
      ctx.userId,
      ctx.redemptionId,
      this.pkg,
    );

    if (result.status === "duplicate") {
      Logger.debug(
        "CoinExchangeHandler",
        `Skipped duplicate redemption ${ctx.redemptionId} (${this.pkg.rewardTitle})`,
      );
      return;
    }

    if (result.status === "user-not-found") {
      Logger.warn(
        "CoinExchangeHandler",
        `Coin exchange for unknown user ${ctx.username} skipped (${this.pkg.rewardTitle})`,
      );
      return;
    }

    const message = BOT_MESSAGES.REWARDS.EXCHANGE_COMPLETED(
      ctx.username,
      this.pkg.rewardTitle,
      this.pkg.coinsAwarded,
    );
    await this.chatbotService.sendAnnouncement(message, "green");

    Logger.info(
      "CoinExchangeHandler",
      `Processed ${this.pkg.rewardTitle} for ${ctx.username}: +${result.awarded} coins`,
    );
  }
}
