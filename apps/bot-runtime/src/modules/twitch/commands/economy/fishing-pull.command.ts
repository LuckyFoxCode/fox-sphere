import { secureRandomInt } from "@fox-sphere/backend-shared";
import type { FishCatch } from "@fox-sphere/backend-shared";
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

export class FishingPullCommand implements TwitchCommand {
  readonly name = "тянуть";
  readonly alliases = ["pull"];
  readonly cooldown: CooldownConfig = {
    time: FISHING_CONFIG.PULL_COOLDOWN_MS,
    type: "user",
    notifyMessage: FISHING_MESSAGES.PULL_COOLDOWN,
  };

  constructor(
    private chatbotService: ChatbotService,
    private fishingService: FishingService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    const result = await this.fishingService.pull(twitchId);

    if (result.type === "no-cast") {
      throw new CommandError(FISHING_MESSAGES.PULL_NO_CAST(ctx.user));
    }
    if (result.type === "expired") {
      throw new CommandError(FISHING_MESSAGES.PULL_TOO_LATE(ctx.user));
    }
    if (result.type === "waiting") {
      throw new CommandError(FISHING_MESSAGES.PULL_EARLY(ctx.user));
    }

    const message = this.buildCatchMessage(ctx.user, result.catch);
    if (message) {
      await this.chatbotService.sendMessage(ctx.channel, message);
    }
  }

  private buildCatchMessage(username: string, caught: FishCatch): string {
    switch (caught.catchType) {
      case "empty": {
        const variants = FISHING_MESSAGES.EMPTY_VARIANTS;
        return variants[secureRandomInt(variants.length)](username);
      }
      case "coins": {
        const variants = FISHING_MESSAGES.COINS_VARIANTS;
        return variants[secureRandomInt(variants.length)](
          username,
          caught.coinAmount,
        );
      }
      case "xp":
        return FISHING_MESSAGES.CATCH_XP(username, caught.xpAmount);
      case "bank":
        return FISHING_MESSAGES.CATCH_BANK(username, caught.bankAmount);
    }
  }
}
