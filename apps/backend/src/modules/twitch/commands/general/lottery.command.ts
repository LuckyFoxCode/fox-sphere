import { LOTTERY_MESSAGES } from "../../../lottery";
import { COOLDOWNS, UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class LotteryCommand implements TwitchCommand {
  readonly name = "runlottery";
  readonly alliases = ["lottery", "лотерея"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.XP_LOTTERY_COOLDOWN,
    type: "user" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const broadcaster = ctx.msg.userInfo.isBroadcaster;

    if (!broadcaster) return;

    const isLotterySuccess = await this.userService.triggerLottery();

    if (!isLotterySuccess) {
      const channelName = ctx.channel;
      await this.chatbotService.sendMessage(
        channelName,
        LOTTERY_MESSAGES.NO_PARTICIPANTS(),
      );
    }
  }
}
