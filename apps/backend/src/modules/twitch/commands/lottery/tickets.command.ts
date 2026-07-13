import { prisma } from "../../../../shared/lib";
import { Logger } from "../../../../shared/services";
import { LOTTERY_MESSAGES } from "../../../lottery";
import { ChatbotService } from "../../chatbot.service";
import { COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class TicketsCommands implements TwitchCommand {
  readonly name = "tickets";
  readonly alliases = ["розыгрыш"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    try {
      const tickets = await prisma.userLottery.findMany({
        where: { hasTicket: true },
        include: { user: true },
      });

      if (tickets.length === 0) {
        await this.chatbotService.sendMessage(
          ctx.channel,
          LOTTERY_MESSAGES.NO_PARTICIPANTS_YET,
        );
      }

      const message = LOTTERY_MESSAGES.TOTAL_PARTICIPANTS(tickets.length);
      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "TicketsCommands",
        `💥 Failed to fetch lottery tickets or send message in channel ${ctx.channel}`,
        error,
      );
    }
  }
}
