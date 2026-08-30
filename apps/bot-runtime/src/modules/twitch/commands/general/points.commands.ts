import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class PointsCommand implements TwitchCommand {
  readonly name = "points";
  readonly alliases = ["economy", "coinsinfo", "баллы", "поинты", "экономика"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    const message = BOT_MESSAGES.COMMANDS.POINTS;
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
