import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class GitHubCommand implements TwitchCommand {
  readonly name = "gh";
  readonly alliases = ["github", "git", "code", "repo", "репозиторий", "код"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    const message = BOT_MESSAGES.COMMANDS.GH;
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
