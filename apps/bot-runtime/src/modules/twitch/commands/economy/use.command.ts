import { findHeroByTerm, HEROES } from "@fox-sphere/types";
import { HeroService } from "../../../hero";
import { UserService } from "../../../user";
import { globalEventBus } from "../../../../shared/services";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";
import { HERO_CATEGORIES, parseItemArgs } from "./item-args";

export class UseCommand implements TwitchCommand {
  readonly name = "use";
  readonly alliases = ["надеть", "активировать"];
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.USE_COMMAND,
    type: "user",
  };

  constructor(
    private chatbotService: ChatbotService,
    private heroService: HeroService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const parsed = parseItemArgs(ctx.args);

    // Same two answers as `!buy`: a missing argument and a category that is not ours both end
    // in the usage hint, because naming the categories only helps once one of them is typed.
    if (!parsed || !HERO_CATEGORIES.has(parsed.category)) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        BOT_MESSAGES.COMMANDS.USE_USAGE(ctx.user),
      );
      return;
    }

    // `findHeroByTerm`, not `getHeroById`: the latter falls back to the default hero, which
    // would turn a typo into equipping whatever the viewer already had.
    const hero = findHeroByTerm(parsed.term);

    if (!hero) {
      // The catalog list is the same answer `!buy` gives, and it is the only message that
      // names what does exist - `USE_USAGE` would repeat the syntax without saying the name
      // is wrong.
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
    const result = await this.heroService.equipHero(twitchId, hero.id);

    switch (result) {
      case "not-owned":
        await this.chatbotService.sendMessage(
          ctx.channel,
          BOT_MESSAGES.COMMANDS.USE_NOT_OWNED(ctx.user, hero.name),
        );
        return;
      case "already-active":
        await this.chatbotService.sendMessage(
          ctx.channel,
          BOT_MESSAGES.COMMANDS.USE_ALREADY_ACTIVE(ctx.user, hero.name),
        );
        return;
      case "equipped":
        // The cache goes first: the overlay re-spawns from the event, and the next chat
        // message must already carry the new hero id or it would put the old sprite back.
        // `HeroService` cannot drop it itself - `UserService` depends on it, and the
        // dependency the other way would be a cycle - so the command owns it.
        await this.userService.invalidateHero(twitchId);

        globalEventBus.emit("hero:changed", { twitchId, heroId: hero.id });

        await this.chatbotService.sendMessage(
          ctx.channel,
          BOT_MESSAGES.COMMANDS.USE_SUCCESS(ctx.user, hero.name),
        );
        return;
    }
  }
}
