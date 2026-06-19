import { globalEventBus } from "../../../../shared/services";
import {
  LOTTERY_CONFIG,
  LOTTERY_DELAYS,
  LOTTERY_MESSAGES,
} from "../../../lottery";
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

    const totalDurationMs =
      LOTTERY_DELAYS.ROTATION_PAUSE +
      LOTTERY_CONFIG.WINNERS_COUNT * LOTTERY_DELAYS.NEXT_WINNER_PAUSE +
      LOTTERY_DELAYS.FINAL_PAUSE;
    const totalDurationSeconds = Math.ceil(totalDurationMs / 1000);

    globalEventBus.emit("lottery:started", { duration: totalDurationSeconds });

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
