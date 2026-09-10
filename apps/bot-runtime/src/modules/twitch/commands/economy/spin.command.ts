import type { RouletteSpinResultPayload } from "@fox-sphere/types";
import { ROULETTE_SPIN_ANIMATION_MS } from "@fox-sphere/types";
import { RouletteService, ROULETTE_CONFIG, ROULETTE_MESSAGES } from "../../../roulette";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import {
  CommandContext,
  CommandError,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

// Чат-ответ (твич + чат-виджет оверлея) уходит в момент остановки колеса,
// а не вместе с событием спина — оверлей начинает вращение раньше.
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class SpinCommand implements TwitchCommand {
  readonly name = "spin";
  readonly alliases = ["крутить"];
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

    // Колесо на оверлее крутится ROULETTE_SPIN_ANIMATION_MS — чат ждёт остановки.
    await sleep(ROULETTE_SPIN_ANIMATION_MS);

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
