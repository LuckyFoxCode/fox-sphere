import { ChatMessage } from "@twurple/chat";

export interface CooldownConfig {
  time: number;
  type: "user" | "global";
}

export interface CommandContext {
  channel: string;
  user: string;
  text: string;
  msg: ChatMessage;
}

export interface TwitchCommand {
  readonly name: string;
  readonly alliases?: string[];
  readonly cooldown?: CooldownConfig;
  execute(ctx: CommandContext): Promise<void>;
}
