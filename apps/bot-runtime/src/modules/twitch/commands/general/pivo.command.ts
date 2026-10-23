import { secureRandomInt } from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../../../shared/services";
import { PivoService } from "../../../pivo";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class PivoCommand implements TwitchCommand {
  readonly name = "pivo";
  readonly alliases = ["пиво", "beer"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.PIVO_COMMAND,
    type: "user" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private pivoService: PivoService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const roll = await this.pivoService.roll(ctx.msg.userInfo.userId);

    await this.chatbotService.sendMessage(
      ctx.channel,
      roll.outcome === "golden"
        ? BOT_MESSAGES.COMMANDS.PIVO_GOLDEN(ctx.user)
        : this.pickRandomMessage(ctx.user),
    );

    // Эмит после сообщения: если чат не принял строку, оверлей не должен показать дроп,
    // которого зритель не увидел.
    if (roll.outcome === "golden") {
      globalEventBus.emit("twitch:golden-beer", {
        userId: ctx.msg.userInfo.userId,
        username: ctx.user,
        displayName: ctx.msg.userInfo.displayName,
        goldenBeers: roll.goldenBeers,
        tier: roll.tier,
        isNewTier: roll.isNewTier,
      });
    }
  }

  private pickRandomMessage(username: string): string {
    const messages = BOT_MESSAGES.COMMANDS.PIVO;
    return messages[secureRandomInt(messages.length)](username);
  }
}
