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

    // Presence is not the requirement - sequence is. With the emit first the overlay re-spawns
    // correctly, but the viewer's next message still carries the old hero id out of the warm
    // cache and puts the old sprite back, so `invalidateHero` has to run before the emit. The
    // command emits exactly once, so index 0 of the spy is the `hero:changed` call.
    expect(vi.mocked(user.invalidateHero).mock.invocationCallOrder[0]).toBeLessThan(
      spy.mock.invocationCallOrder[0],
    );
  });

  it("does not touch the overlay when the hero is not owned", async () => {
    const spy = vi.spyOn(globalEventBus, "emit");
    const chatbot = makeChatbot();
    const user = makeUser();
    const heroes = makeHeroes("not-owned");

    await new UseCommand(chatbot, heroes, user).execute(makeContext(["hero", "thug"]));

    // One argument, not `("hero:changed", expect.anything())`: the two-argument form only fails
    // on an emit that carries a payload, so a payload-less `hero:changed` would slip through.
    expect(spy).not.toHaveBeenCalledWith("hero:changed");
    expect(user.invalidateHero).not.toHaveBeenCalled();
    expect(heroes.equipHero).toHaveBeenCalledWith("twitch_111", "thug");
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_NOT_OWNED(CALLER, "Thug"),
    );
  });

  it("says the hero is already active", async () => {
    const spy = vi.spyOn(globalEventBus, "emit");
    const chatbot = makeChatbot();
    const user = makeUser();

    await new UseCommand(chatbot, makeHeroes("already-active"), user).execute(
      makeContext(["hero", "thug"]),
    );

    expect(spy).not.toHaveBeenCalledWith("hero:changed");
    expect(user.invalidateHero).not.toHaveBeenCalled();
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_ALREADY_ACTIVE(CALLER, "Thug"),
    );
  });

  it("asks for a hero name when the argument is missing", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const heroes = makeHeroes("equipped");

    await new UseCommand(chatbot, heroes, user).execute(makeContext(["hero"]));

    expect(heroes.equipHero).not.toHaveBeenCalled();
    expect(user.invalidateHero).not.toHaveBeenCalled();
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_USAGE(CALLER),
    );
  });

  it("asks for a hero name when the category is not a hero", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const heroes = makeHeroes("equipped");

    await new UseCommand(chatbot, heroes, user).execute(makeContext(["skin", "thug"]));

    expect(heroes.equipHero).not.toHaveBeenCalled();
    expect(user.invalidateHero).not.toHaveBeenCalled();
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.USE_USAGE(CALLER),
    );
  });
});
