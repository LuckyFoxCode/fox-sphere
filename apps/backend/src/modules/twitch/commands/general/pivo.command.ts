import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

const GOLDEN_BEER_CHANCE = 0.05;

export class PivoCommand implements TwitchCommand {
  readonly name = "pivo";
  readonly alliases = ["пиво", "beer"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.PIVO_COMMAND,
    type: "user" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    const isGoldenBeer = Math.random() < GOLDEN_BEER_CHANCE;
    const message = isGoldenBeer
      ? BOT_MESSAGES.COMMANDS.PIVO_GOLDEN(ctx.user)
      : this.pickRandomMessage(ctx.user);
    await this.chatbotService.sendMessage(ctx.channel, message);
  }

  private pickRandomMessage(username: string): string {
    const messages = BOT_MESSAGES.COMMANDS.PIVO;
    return messages[Math.floor(Math.random() * messages.length)](username);
  }
}
