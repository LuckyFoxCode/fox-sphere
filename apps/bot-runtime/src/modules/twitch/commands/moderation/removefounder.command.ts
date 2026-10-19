import { ApiClient } from "@twurple/api";
import { Logger } from "@fox-sphere/backend-shared";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

/**
 * Revokes the founder flag - `!removefounder <username>`, broadcaster or mod.
 *
 * The mirror of `AddFounderCommand`, kept separate rather than one command with a mode
 * argument because that is how the VIP pair has always read in chat.
 */
export class RemoveFounderCommand implements TwitchCommand {
  readonly name = "removefounder";
  readonly alliases = ["rfounder"];
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private apiClient: ApiClient,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.msg.userInfo.isBroadcaster && !ctx.msg.userInfo.isMod) {
      const message = BOT_MESSAGES.COMMANDS.DENIED(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    const targetUsername = ctx.args[0]?.replace("@", "").trim();

    if (!targetUsername) {
      const message = BOT_MESSAGES.COMMANDS.REMOVE_FOUNDER_WARNING(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    try {
      const userResponse =
        await this.apiClient.users.getUserByName(targetUsername);

      if (!userResponse) {
        const message =
          BOT_MESSAGES.COMMANDS.REMOVE_FOUNDER_NOTFOUND(targetUsername);
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      await this.userService.setFounder(
        userResponse.id,
        userResponse.name,
        false,
      );

      const message = BOT_MESSAGES.COMMANDS.REMOVE_FOUNDER(
        ctx.user,
        userResponse.name,
      );
      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "RemoveFounderCommand",
        `──★ ˙🍓 ̟ !!Failed to remove founder for @${targetUsername}`,
        error,
      );
    }
  }
}
