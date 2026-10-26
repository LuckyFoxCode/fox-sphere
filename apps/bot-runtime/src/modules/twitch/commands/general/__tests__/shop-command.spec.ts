import { describe, expect, it, vi } from "vitest";
import { globalEventBus } from "../../../../../shared/services";
import { BOT_MESSAGES, COOLDOWNS } from "../../../twitch.constants";
import type { ChatbotService } from "../../../chatbot.service";
import type { CommandContext } from "../../command.interface";
import { ShopCommand } from "../shop.command";

// The storefront is the catalog and nothing else: the command emits one event and answers in
// chat, with no Prisma import anywhere on the path. Fakes rather than a database because there
// is no row to read - what is asserted is the payload the overlay receives and the cooldown
// that keeps a repeat `!shop` inside the minute silent.

const CHANNEL = "luckyfoxcode";
const CALLER = "alice";

const makeChatbot = () => ({ sendMessage: vi.fn(async () => {}) } as unknown as ChatbotService);

const makeContext = (args: string[]): CommandContext =>
  ({
    channel: CHANNEL,
    user: CALLER,
    text: args.join(" "),
    args,
    msg: { userInfo: { userId: "twitch_111" } },
  } as unknown as CommandContext);

describe("ShopCommand", () => {
  it("opens the shop for the overlay without touching the database", async () => {
    const spy = vi.spyOn(globalEventBus, "emit");
    const chatbot = makeChatbot();

    await new ShopCommand(chatbot).execute(makeContext([]));

    expect(spy).toHaveBeenCalledWith("shop:show", { openedBy: CALLER });
    expect(chatbot.sendMessage).toHaveBeenCalledWith(CHANNEL, BOT_MESSAGES.COMMANDS.SHOP_OPEN);
  });

  it("uses a global cooldown longer than the display", () => {
    expect(new ShopCommand(makeChatbot()).cooldown).toEqual({
      time: COOLDOWNS.SHOP_COMMAND,
      type: "global",
    });
  });
});
