import { Logger } from "@fox-sphere/backend-shared";
import { findChannelUser } from "../../../channel";
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

      // Three columns on this channel's balance row, where they used to be a `UserLottery`
      // join reached through `User`. Read-only and `null`-tolerant on purpose: a viewer who has
      // not earned XP yet has no progress to report, and `?ticket` should say so rather than
      // fail. `ensureUserExists` runs on this message before the command, so `null` means that
      // call threw - not that the viewer has a zero balance.
      const channelUser = await findChannelUser(twitchId);

      const xp = channelUser?.xpThisWeek ?? 0;
      const hasTicket = channelUser?.hasTicket ?? false;

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
