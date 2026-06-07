import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class CoinsCommand implements TwitchCommand {
  readonly name = "coins";
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.COINS_COMMAND,
    type: "user" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    const coins = await this.userService.getUserCoins(twitchId);

    const message = BOT_MESSAGES.COMMANDS.WALLET_BALANCE(ctx.user, coins);
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
