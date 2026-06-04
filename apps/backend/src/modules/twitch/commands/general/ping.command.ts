import { ChatbotService } from "../../chatbot.service";
import { CommandContext, TwitchCommand } from "../command.interface";

export class PingCommand implements TwitchCommand {
  readonly name = "ping";

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    await this.chatbotService.sendMessage(ctx.channel, `@${ctx.user}, pong!`);
  }
}
