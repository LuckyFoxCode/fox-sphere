import { config } from "@fox-sphere/backend-shared";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class VersionCommand implements TwitchCommand {
  readonly name = "version";
  readonly alliases = ["ver", "версия"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "user" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    const message = BOT_MESSAGES.COMMANDS.VERSION(config.version);
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
