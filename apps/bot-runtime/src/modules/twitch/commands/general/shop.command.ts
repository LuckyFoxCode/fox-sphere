import { globalEventBus } from "../../../../shared/services";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

/**
 * `!shop` — opens the storefront on the overlay and says so in chat.
 *
 * The window is the catalog, not a viewer's collection: what is on screen is the same for
 * everybody, so the command reads nothing. That is also why there is no Prisma import here —
 * ownership and balance are `!buy`'s business, and a shared window showing "owned" would leak
 * one viewer's state into everyone else's stream.
 */
export class ShopCommand implements TwitchCommand {
  readonly name = "shop";
  readonly alliases = ["магазин", "витрина"];
  // Global rather than per-viewer: one overlay, one storefront. The registry has no chat
  // message for a global cooldown, so a repeat inside the minute is silent by design.
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.SHOP_COMMAND,
    type: "global",
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    globalEventBus.emit("shop:show", { openedBy: ctx.user });

    await this.chatbotService.sendMessage(
      ctx.channel,
      BOT_MESSAGES.COMMANDS.SHOP_OPEN,
    );
  }
}
