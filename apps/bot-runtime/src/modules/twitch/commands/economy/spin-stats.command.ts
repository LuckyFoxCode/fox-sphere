import { ROULETTE_CONFIG, ROULETTE_MESSAGES } from "../../../roulette";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class SpinStatsCommand implements TwitchCommand {
  readonly name = "spinstats";
  readonly alliases = ["спинстатс"];
  readonly cooldown: CooldownConfig = {
    time: ROULETTE_CONFIG.SPIN_STATS_COOLDOWN,
    type: "user",
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.userService.getUsersStats(ctx.msg.userInfo.userId);

    if (!user || user.spinsCount === 0) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        ROULETTE_MESSAGES.SPIN_STATS_ZERO(ctx.user),
      );
      return;
    }

    await this.chatbotService.sendMessage(
      ctx.channel,
      ROULETTE_MESSAGES.SPIN_STATS(
        ctx.user,
        user.spinsCount,
        user.totalWin,
        user.totalLoss,
      ),
    );
  }
}
