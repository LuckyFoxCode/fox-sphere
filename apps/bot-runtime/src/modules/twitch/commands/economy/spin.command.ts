import type { RouletteSpinResultPayload } from "@fox-sphere/types";
import { RouletteService, ROULETTE_CONFIG, ROULETTE_MESSAGES } from "../../../roulette";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import {
  CommandContext,
  CommandError,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class SpinCommand implements TwitchCommand {
  readonly name = "spin";
  readonly alliases = ["roll"];
  readonly cooldown: CooldownConfig = {
    time: ROULETTE_CONFIG.SPIN_COOLDOWN,
    type: "user",
    notifyMessage: ROULETTE_MESSAGES.COOLDOWN,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private rouletteService: RouletteService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    const coins = await this.userService.getUserCoins(twitchId);
    if (coins < ROULETTE_CONFIG.PRICE) {
      throw new CommandError(
        ROULETTE_MESSAGES.NOT_ENOUGH_COINS(
          ctx.user,
          ROULETTE_CONFIG.PRICE,
          coins,
        ),
      );
    }

    const result = await this.rouletteService.spinUser({
      twitchId,
      username: ctx.user,
    });

    if (result.jackpotWon) {
      await this.chatbotService.sendAnnouncement(
        ROULETTE_MESSAGES.JACKPOT_ANNOUNCE(ctx.user),
        "blue",
      );
      await this.chatbotService.sendMessage(
        ctx.channel,
        ROULETTE_MESSAGES.JACKPOT_RESULT(
          ctx.user,
          result.coinAmount,
          result.jackpotTotalAfter,
        ),
      );
      return;
    }

    const message = this.buildMessage(result);
    if (message) {
      await this.chatbotService.sendMessage(ctx.channel, message);
    }
  }

  private buildMessage(result: RouletteSpinResultPayload): string | null {
    switch (result.prizeType) {
      case "empty":
        // Пустой результат не идёт в чат — его показывает колесо на оверлее.
        return null;
      case "coins":
        return ROULETTE_MESSAGES.COINS_RESULT(result.username, result.coinAmount);
      case "xp":
        return ROULETTE_MESSAGES.XP_RESULT(result.username, result.xpAmount);
      case "jackpot":
        return null;
    }
  }
}
