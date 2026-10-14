import { Logger, prisma } from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../../../shared/services";
import { resolveChannelContext } from "../../../channel";
import { LOTTERY_MESSAGES } from "../../../lottery";
import { ChatbotService } from "../../chatbot.service";
import { COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class TicketsCommand implements TwitchCommand {
  readonly name = "tickets";
  readonly alliases = ["розыгрыш"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    try {
      const { channelId } = await resolveChannelContext();

      // Scoped to this channel, which the `UserLottery` query was not: it answered with every
      // ticket holder on the deployment. `Viewer` supplies the names, since `username` is no
      // longer a `ChannelUser` column.
      const participants = await prisma.channelUser.findMany({
        where: { channelId, hasTicket: true },
        select: { viewer: { select: { twitchId: true, username: true } } },
      });

      if (participants.length === 0) {
        await this.chatbotService.sendMessage(
          ctx.channel,
          LOTTERY_MESSAGES.NO_PARTICIPANTS_YET,
        );
        return;
      }

      const participantsData = participants.map((p) => ({
        twitchId: p.viewer.twitchId,
        username: p.viewer.username,
      }));

      if (participants.length >= 10) {
        globalEventBus.emit("lottery:participants", participantsData);

        const message = LOTTERY_MESSAGES.TOTAL_PARTICIPANTS(
          participants.length,
        );
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      const usernames = participants
        .map((p, idx) => `🔹 ${idx + 1}. @${p.viewer.username}`)
        .join(", ");
      const message = LOTTERY_MESSAGES.ALL_PARTICIPANTS(
        usernames,
        participants.length,
      );

      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "TicketsCommand",
        `💥 Failed to fetch lottery tickets or send message in channel ${ctx.channel}`,
        error,
      );
    }
  }
}
