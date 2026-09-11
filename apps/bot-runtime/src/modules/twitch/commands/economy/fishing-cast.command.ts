import { ChatbotService } from "../../chatbot.service";
import {
  FISHING_CONFIG,
  FISHING_MESSAGES,
  FishingService,
} from "../../../fishing";
import {
  CommandContext,
  CommandError,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class FishingCastCommand implements TwitchCommand {
  readonly name = "рыбалка";
  readonly alliases = ["рыбачить", "fish"];
  readonly cooldown: CooldownConfig = {
    time: FISHING_CONFIG.CAST_COOLDOWN_MS,
    type: "user",
    notifyMessage: FISHING_MESSAGES.CAST_COOLDOWN,
  };

  constructor(
    private chatbotService: ChatbotService,
    private fishingService: FishingService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    const result = this.fishingService.cast({
      twitchId,
      username: ctx.user,
      channel: ctx.channel,
    });

    if (result === "already") {
      throw new CommandError(FISHING_MESSAGES.ALREADY_FISHING(ctx.user));
    }

    await this.chatbotService.sendMessage(
      ctx.channel,
      FISHING_MESSAGES.CAST_ACCEPTED(ctx.user),
    );
  }
}
