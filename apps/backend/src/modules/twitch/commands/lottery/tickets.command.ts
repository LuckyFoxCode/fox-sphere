import { prisma } from "../../../../shared/lib";
import { globalEventBus, Logger } from "../../../../shared/services";
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
      const participants = await prisma.userLottery.findMany({
        where: { hasTicket: true },
        include: { user: true },
      });

      if (participants.length === 0) {
        await this.chatbotService.sendMessage(
          ctx.channel,
          LOTTERY_MESSAGES.NO_PARTICIPANTS_YET,
        );
        return;
      }

      const participantsData = participants.map((p) => ({
        twitchId: p.user.twitchId,
        username: p.user.username,
      }));

      if (participants.length > 10) {
        globalEventBus.emit("lottery:participants", participantsData);

        const message = LOTTERY_MESSAGES.TOTAL_PARTICIPANTS(
          participants.length,
        );
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      const usernames = participants
        .map((p, idx) => `🔹 ${idx + 1}. @${p.user.username}`)
        .join(", ");
      const message = LOTTERY_MESSAGES.ALL_PARTICIPANTS(
        usernames,
        participants.length,
      );

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
