import { Logger } from "../../../../shared/services/logger.service";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { COOLDOWNS } from "../../twitch.constants";
import { CommandContext, TwitchCommand } from "../command.interface";

export class CoinsCommand implements TwitchCommand {
  readonly name = "coins";
  private coinsCommandCooldown = new Set<string>();

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    if (this.coinsCommandCooldown.has(twitchId)) {
      Logger.debug(
        "CoinsCommand",
        `Ignored !coins spam from user: ${ctx.user}`,
      );
      return;
    }

    try {
      const coins = await this.userService.getUserCoins(twitchId);

      await this.chatbotService.sendMessage(
        ctx.channel,
        `💰 Wallet • @${ctx.user} ➔ ${coins} Coins 🪙`,
      );

      this.coinsCommandCooldown.add(twitchId);
      setTimeout(() => {
        this.coinsCommandCooldown.delete(twitchId);
      }, COOLDOWNS.COINS_COMMAND);
    } catch (error) {
      Logger.error(
        "CoinsCommand",
        `Failed to execute !coins command for user: ${ctx.user}`,
        error,
      );
    }
  }
}
