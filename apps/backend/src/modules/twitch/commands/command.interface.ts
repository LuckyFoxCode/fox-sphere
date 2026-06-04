import { ChatMessage } from "@twurple/chat";

export interface CommandContext {
  channel: string;
  user: string;
  text: string;
  msg: ChatMessage;
}

export interface TwitchCommand {
  name: string;
  allias?: string[];
  execute(ctx: CommandContext): Promise<void>;
}
