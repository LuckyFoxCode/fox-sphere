import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@twurple/api";
import type { ChatMessage } from "@twurple/chat";
import { BOT_MESSAGES } from "../../../twitch.constants";
import type { ChatbotService } from "../../../chatbot.service";
import type { UserService } from "../../../../user";
import type { CommandContext } from "../../command.interface";
import { AddFounderCommand } from "../addfounder.command";
import { RemoveFounderCommand } from "../removefounder.command";

// The founder flag is written by chat commands alone, so these are the whole surface of the
// feature: who may grant it, the username argument, and which flag each command writes.
// Fakes rather than the database because nothing here reaches Prisma through the command -
// `UserService.setFounder` is asserted at its own call site, in `user.service.spec.ts`.

const CHANNEL = "luckyfoxcode";
const CALLER = "some_mod";

const makeChatbot = () =>
  ({
    sendMessage: vi.fn(async () => {}),
  } as unknown as ChatbotService);

const makeUser = () =>
  ({
    setFounder: vi.fn(async () => {}),
  } as unknown as UserService);

const makeApi = (resolvedUser: { id: string; name: string } | null) =>
  ({
    users: {
      getUserByName: vi.fn(async () => resolvedUser),
    },
  } as unknown as ApiClient);

const makeContext = (
  args: string[],
  caller: { isBroadcaster?: boolean; isMod?: boolean } = {},
): CommandContext => ({
  channel: CHANNEL,
  user: CALLER,
  text: `!addfounder ${args.join(" ")}`,
  args,
  msg: {
    channelId: "channel_test_channel",
    userInfo: {
      userId: "twitch_caller",
      isBroadcaster: caller.isBroadcaster ?? false,
      isMod: caller.isMod ?? false,
    },
  } as unknown as ChatMessage,
});

describe("AddFounderCommand", () => {
  it("denies anyone who is neither broadcaster nor mod", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new AddFounderCommand(chatbot, user, makeApi(null));

    await command.execute(makeContext(["someone"]));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.DENIED(CALLER),
    );
    expect(user.setFounder).not.toHaveBeenCalled();
  });

  it("asks for a username when none was given", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new AddFounderCommand(chatbot, user, makeApi(null));

    await command.execute(makeContext([], { isMod: true }));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.ADD_FOUNDER_WARNING(CALLER),
    );
    expect(user.setFounder).not.toHaveBeenCalled();
  });

  it("reports an unknown Twitch username without writing anything", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new AddFounderCommand(chatbot, user, makeApi(null));

    await command.execute(makeContext(["nobody_here"], { isMod: true }));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.ADD_FOUNDER_NOTFOUND("nobody_here"),
    );
    expect(user.setFounder).not.toHaveBeenCalled();
  });

  it("grants the flag with isFounder = true and answers in chat", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new AddFounderCommand(
      chatbot,
      user,
      makeApi({ id: "twitch_target", name: "target" }),
    );

    await command.execute(makeContext(["@Target"], { isMod: true }));

    expect(user.setFounder).toHaveBeenCalledWith(
      "twitch_target",
      "target",
      true,
    );
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.ADD_FOUNDER(CALLER, "target"),
    );
  });
});

describe("RemoveFounderCommand", () => {
  it("denies anyone who is neither broadcaster nor mod", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new RemoveFounderCommand(chatbot, user, makeApi(null));

    await command.execute(makeContext(["someone"]));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.DENIED(CALLER),
    );
    expect(user.setFounder).not.toHaveBeenCalled();
  });

  it("asks for a username when none was given", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new RemoveFounderCommand(chatbot, user, makeApi(null));

    await command.execute(makeContext([], { isMod: true }));

    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.REMOVE_FOUNDER_WARNING(CALLER),
    );
    expect(user.setFounder).not.toHaveBeenCalled();
  });

  it("clears the flag with isFounder = false and answers in chat", async () => {
    const chatbot = makeChatbot();
    const user = makeUser();
    const command = new RemoveFounderCommand(
      chatbot,
      user,
      makeApi({ id: "twitch_target", name: "target" }),
    );

    await command.execute(makeContext(["target"], { isMod: true }));

    expect(user.setFounder).toHaveBeenCalledWith(
      "twitch_target",
      "target",
      false,
    );
    expect(chatbot.sendMessage).toHaveBeenCalledWith(
      CHANNEL,
      BOT_MESSAGES.COMMANDS.REMOVE_FOUNDER(CALLER, "target"),
    );
  });
});
