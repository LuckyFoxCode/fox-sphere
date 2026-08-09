import { prisma } from "../../../../shared/lib";
import { Logger } from "../../../../shared/services";
import { LOTTERY_CONFIG, LOTTERY_MESSAGES } from "../../../lottery";
import { ChatbotService } from "../../chatbot.service";
import { COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class TicketCommand implements TwitchCommand {
  readonly name = "ticket";
  readonly alliases = ["билет"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "user" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    try {
      const twitchId = ctx.msg.userInfo.userId;

      const user = await prisma.user.findUnique({
        where: { twitchId },
        include: { lotteryContext: true },
      });

      const xp = user?.lotteryContext?.xpThisWeek ?? 0;
      const hasTicket = user?.lotteryContext?.hasTicket ?? false;

      const message = hasTicket
        ? LOTTERY_MESSAGES.TICKET_ALREADY_EARNED(ctx.user)
        : LOTTERY_MESSAGES.TICKET_PROGRESS(
            ctx.user,
            xp,
            LOTTERY_CONFIG.TICKET_XP_THRESHOLD,
          );

      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "TicketCommand",
        `💥 Failed to fetch lottery progress or send message in channel ${ctx.channel}`,
        error,
      );
    }
  }
}
