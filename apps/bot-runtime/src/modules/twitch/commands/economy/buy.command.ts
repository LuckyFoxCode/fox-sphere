import { findHeroByTerm, HEROES } from "@fox-sphere/types";
import { HeroService } from "../../../hero";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";
import { HERO_CATEGORIES, parseItemArgs } from "./item-args";

export class BuyCommand implements TwitchCommand {
  readonly name = "buy";
  readonly alliases = ["купить"];
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.BUY_COMMAND,
    type: "user",
  };

  constructor(
    private chatbotService: ChatbotService,
    private heroService: HeroService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const parsed = parseItemArgs(ctx.args);

    // A missing argument and a category that is not ours both end in the same hint: the list of
    // categories only becomes useful with the second one, so naming it here would advertise
    // something the bot cannot sell yet.
    if (!parsed || !HERO_CATEGORIES.has(parsed.category)) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        BOT_MESSAGES.COMMANDS.BUY_USAGE(ctx.user),
      );
      return;
    }

    // `findHeroByTerm`, not `getHeroById`: the latter falls back to the default hero, which
    // would turn a typo into a free purchase of the hero everybody already owns.
    const hero = findHeroByTerm(parsed.term);

    if (!hero) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        BOT_MESSAGES.COMMANDS.BUY_UNKNOWN_HERO(
          ctx.user,
          HEROES.map((available) => available.name).join(", "),
        ),
      );
      return;
    }

    const twitchId = ctx.msg.userInfo.userId;
    const result = await this.heroService.buyHero(twitchId, hero);

    switch (result.status) {
      case "already-owned":
        await this.chatbotService.sendMessage(
          ctx.channel,
          BOT_MESSAGES.COMMANDS.BUY_ALREADY_OWNED(ctx.user, hero.name),
        );
        return;
      case "insufficient-funds":
        await this.chatbotService.sendMessage(
          ctx.channel,
          BOT_MESSAGES.COMMANDS.BUY_NOT_ENOUGH(
            ctx.user,
            hero.name,
            hero.price,
            result.coins,
            result.shortfall,
          ),
        );
        return;
      case "bought":
        // `HeroService` cannot drop the cache itself: `UserService` already depends on it, and
        // the dependency the other way would be a cycle. The command owns it, and only on a
        // purchase - a rejected attempt leaves the balance unchanged.
        await this.userService.invalidateCoins(twitchId);

        await this.chatbotService.sendMessage(
          ctx.channel,
          hero.price === 0
            ? BOT_MESSAGES.COMMANDS.BUY_FREE(ctx.user, hero.name)
            : BOT_MESSAGES.COMMANDS.BUY_SUCCESS(
                ctx.user,
                hero.name,
                hero.price,
                result.coinsAfter,
              ),
        );
        return;
    }
  }
}
