import { ApiClient } from "@twurple/api";
import { Logger } from "../../../../shared/services";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class RemoveVipCommand implements TwitchCommand {
  readonly name = "removevip";
  readonly alliases = ["rvip"];
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
      const message = BOT_MESSAGES.COMMANDS.REMOVE_VIP_DENIED(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    const targetUsername = ctx.args[0]?.replace("@", "").trim();

    if (!targetUsername) {
      const message = BOT_MESSAGES.COMMANDS.REMOVE_VIP_WARNING(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
    }

    try {
      const channelId = ctx.msg.channelId!;

      const userResponse =
        await this.apiClient.users.getUserByName(targetUsername);

      if (!userResponse) {
        const message = BOT_MESSAGES.COMMANDS.REMOVE_VIP_NOTFOUND(ctx.user);
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      const targetTwitchId = userResponse.id;
      const cleanUsername = userResponse.name;

      await this.apiClient.asUser(channelId, async (api) => {
        return api.channels.removeVip(channelId, targetTwitchId);
      });

      await this.userService.removeVipFromDb(targetTwitchId, cleanUsername);

      const message = BOT_MESSAGES.COMMANDS.REMOVE_VIP(
        ctx.channel,
        cleanUsername,
      );
      await this.chatbotService.sendMessage(ctx.channel, message);
    } catch (error) {
      Logger.error(
        "RemoveVipCommand",
        `──★ ˙🍓 ̟ !!Failed to remove VIP for @${ctx.user}`,
        error,
      );
    }
  }
}
