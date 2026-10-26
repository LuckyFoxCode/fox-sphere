import { afterEach, describe, expect, it, vi } from "vitest";
import { globalEventBus } from "../../../../../shared/services";
import { BOT_MESSAGES } from "../../../twitch.constants";
import type { ChatbotService } from "../../../chatbot.service";
import type { UserService } from "../../../../user";
import type { HeroService } from "../../../../hero";
import type { CommandContext } from "../../command.interface";
import { UseCommand } from "../use.command";

const CHANNEL = "luckyfoxcode";
const CALLER = "alice";

const makeChatbot = () => ({ sendMessage: vi.fn(async () => {}) } as unknown as ChatbotService);
const makeUser = () => ({ invalidateHero: vi.fn(async () => {}) } as unknown as UserService);
const makeHeroes = (result: "equipped" | "already-active" | "not-owned") =>
  ({ equipHero: vi.fn(async () => result) } as unknown as HeroService);

const makeContext = (args: string[]): CommandContext =>
  ({
    channel: CHANNEL,
    user: CALLER,
    text: args.join(" "),
    args,
    msg: { userInfo: { userId: "twitch_111" } },
  } as unknown as CommandContext);

describe("UseCommand", () => {
  // Without this the `globalEventBus.emit` spy outlives the first test and the second one fails
  // on its call history.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("equips the hero, drops the cached hero and tells the overlay", async () => {
    const spy = vi.spyOn(globalEventBus, "emit");
    const user = makeUser();
    const chatbot = makeChatbot();

    await new UseCommand(chatbot, makeHeroes("equipped"), user).execute(
      makeContext(["hero", "thug"]),
    );

    expect(user.invalidateHero).toHaveBeenCalledWith("twitch_111");
    expect(spy).toHaveBeenCalledWith("hero:changed", { twitchId: "twitch_111", heroId: "thug" });
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_SUCCESS(CALLER, "Thug"),
    );
  });

  it("does not touch the overlay when the hero is not owned", async () => {
    const spy = vi.spyOn(globalEventBus, "emit");
    const chatbot = makeChatbot();

    await new UseCommand(chatbot, makeHeroes("not-owned"), makeUser()).execute(
      makeContext(["hero", "thug"]),
    );

    expect(spy).not.toHaveBeenCalledWith("hero:changed", expect.anything());
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_NOT_OWNED(CALLER, "Thug"),
    );
  });

  it("says the hero is already active", async () => {
    const chatbot = makeChatbot();

    await new UseCommand(chatbot, makeHeroes("already-active"), makeUser()).execute(
      makeContext(["hero", "thug"]),
    );

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_ALREADY_ACTIVE(CALLER, "Thug"),
    );
  });
});
