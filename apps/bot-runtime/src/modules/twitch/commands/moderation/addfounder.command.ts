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
 * Grants the founder flag - `!addfounder <username>`, broadcaster or mod.
 *
 * The VIP command's shape minus both Twitch-side pieces: there is no Helix role to grant
 * (Twitch knows nothing about a founder) and no overlay event, so all that is left is
 * resolving the username to its canonical id and writing `isFounder = true`.
 */
export class AddFounderCommand implements TwitchCommand {
  readonly name = "addfounder";
  readonly alliases = ["founder"];
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
      const message = BOT_MESSAGES.COMMANDS.ADD_FOUNDER_WARNING(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    try {
      const userResponse =
        await this.apiClient.users.getUserByName(targetUsername);

      if (!userResponse) {
        const message =
          BOT_MESSAGES.COMMANDS.ADD_FOUNDER_NOTFOUND(targetUsername);
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      await this.userService.setFounder(userResponse.id, userResponse.name, true);

      const message = BOT_MESSAGES.COMMANDS.ADD_FOUNDER(
        ctx.user,
        userResponse.name,
      );
      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "AddFounderCommand",
        `──★ ˙🍓 ̟ !!Failed to add founder for @${targetUsername}`,
        error,
      );
    }
  }
}
