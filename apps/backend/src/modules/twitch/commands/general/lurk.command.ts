import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class LurkCommand implements TwitchCommand {
  readonly name = "lurk";
  readonly alliases = ["лурк"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.LURK_COMMAND,
    type: "user" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    const messages = BOT_MESSAGES.COMMANDS.LURK;
    const message = messages[Math.floor(Math.random() * messages.length)](
      ctx.user,
    );
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
