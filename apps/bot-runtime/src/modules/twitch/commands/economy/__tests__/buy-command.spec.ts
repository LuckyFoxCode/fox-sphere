import { describe, expect, it, vi } from "vitest";
import { HEROES } from "@fox-sphere/types";
import { BOT_MESSAGES } from "../../../twitch.constants";
import type { ChatbotService } from "../../../chatbot.service";
import type { UserService } from "../../../../user";
import type { HeroService } from "../../../../hero";
import type { CommandContext } from "../../command.interface";
import { BuyCommand } from "../buy.command";

const CHANNEL = "luckyfoxcode";
const CALLER = "alice";

const makeChatbot = () => ({ sendMessage: vi.fn(async () => {}) } as unknown as ChatbotService);
const makeUser = () => ({ invalidateCoins: vi.fn(async () => {}) } as unknown as UserService);
const makeHeroes = (result: unknown) =>
  ({ buyHero: vi.fn(async () => result) } as unknown as HeroService);

const makeContext = (args: string[]): CommandContext =>
  ({
    channel: CHANNEL,
    user: CALLER,
    text: args.join(" "),
    args,
    msg: { userInfo: { userId: "twitch_111" } },
  } as unknown as CommandContext);

describe("BuyCommand", () => {
  it("buys the hero named after the category and reports what is left", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    await new BuyCommand(chatbot, makeHeroes({ status: "bought", coinsAfter: 700 }), user).execute(
      makeContext(["hero", "thug"]),
    );

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_SUCCESS(CALLER, "Thug", 800, 700),
    );
    expect(user.invalidateCoins).toHaveBeenCalledWith("twitch_111");
  });

  it("grants a free hero with the gift line instead of the success line", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const heroes = makeHeroes({ status: "bought", coinsAfter: 50 });

    await new BuyCommand(chatbot, heroes, user).execute(makeContext(["hero", "assassin"]));

    // `assassin` is the free catalog hero. The branch is unreachable from chat today - every
    // viewer already owns the default hero - so this is the only thing that exercises it.
    expect(heroes.buyHero).toHaveBeenCalledWith(
      "twitch_111",
      expect.objectContaining({ id: "assassin", price: 0 }),
    );
    expect(chatbot.sendMessage).toHaveBeenCalledTimes(1);
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_FREE(CALLER, "Assassin"),
    );
    expect(chatbot.sendMessage).not.toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_SUCCESS(CALLER, "Assassin", 0, 50),
    );
    // Still a `bought`: the collection changed even though no coins did.
    expect(user.invalidateCoins).toHaveBeenCalledWith("twitch_111");
  });

  it("says the hero is already owned", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    await new BuyCommand(chatbot, makeHeroes({ status: "already-owned" }), user).execute(
      makeContext(["hero", "thug"]),
    );

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_ALREADY_OWNED(CALLER, "Thug"),
    );
    // Nothing moved, so the cached balance is still correct. Without this, hoisting the
    // invalidation above the `switch` keeps every spec green.
    expect(user.invalidateCoins).not.toHaveBeenCalled();
  });

  it("names the shortfall when there is not enough money", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    await new BuyCommand(
      chatbot,
      makeHeroes({ status: "insufficient-funds", coins: 200, shortfall: 100 }),
      user,
    ).execute(makeContext(["hero", "thug"]));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_NOT_ENOUGH(CALLER, "Thug", 800, 200, 100),
    );
    expect(user.invalidateCoins).not.toHaveBeenCalled();
  });

  it("does not buy the default hero for a typo", async () => {
    const heroes = makeHeroes({ status: "bought", coinsAfter: 0 });
    const chatbot = makeChatbot();
    await new BuyCommand(chatbot, heroes, makeUser()).execute(makeContext(["hero", "tugg"]));

    expect(heroes.buyHero).not.toHaveBeenCalled();
    // The brief wrote `expect.any(String)` as the second argument, but it is interpolated into
    // the message inside `BUY_UNKNOWN_HERO`, so the matcher stringifies to "Any" and never
    // matches. The list is the catalog's names in order, which is what the command must send.
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_UNKNOWN_HERO(
        CALLER,
        HEROES.map((available) => available.name).join(", "),
      ),
    );
  });

  it("answers with the usage hint when the item is missing", async () => {
    const chatbot = makeChatbot();
    await new BuyCommand(chatbot, makeHeroes({ status: "bought", coinsAfter: 0 }), makeUser()).execute(
      makeContext(["hero"]),
    );

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.BUY_USAGE(CALLER),
    );
  });
});
