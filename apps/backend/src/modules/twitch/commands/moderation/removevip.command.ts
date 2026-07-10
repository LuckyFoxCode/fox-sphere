import { ApiClient } from "@twurple/api";
import { globalEventBus, Logger } from "../../../../shared/services";
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
      const message = BOT_MESSAGES.COMMANDS.DENIED(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    const targetUsername = ctx.args[0]?.replace("@", "").trim();

    if (!targetUsername) {
      const message = BOT_MESSAGES.COMMANDS.REMOVE_VIP_WARNING(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    try {
      const channelId = ctx.msg.channelId!;

      const userResponse =
        await this.apiClient.users.getUserByName(targetUsername);

      if (!userResponse) {
        const message =
          BOT_MESSAGES.COMMANDS.REMOVE_VIP_NOTFOUND(targetUsername);
        await this.chatbotService.sendMessage(ctx.channel, message);
        return;
      }

      const targetTwitchId = userResponse.id;
      const cleanUsername = userResponse.name;

      await this.apiClient.asUser(channelId, async (api) => {
        return api.channels.removeVip(channelId, targetTwitchId);
      });

      await this.userService.removeVipFromDb(targetTwitchId, cleanUsername);
      globalEventBus.emit("twitch:remove-vip", {
        twitchId: targetTwitchId,
        username: cleanUsername,
      });

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
