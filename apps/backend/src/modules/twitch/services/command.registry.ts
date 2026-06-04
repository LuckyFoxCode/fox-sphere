import { ChatMessage } from "@twurple/chat";
import { Logger } from "../../../shared/services/logger.service";
import { ChatbotService } from "../chatbot.service";
import { TwitchCommand } from "../commands/command.interface";
import { CoinsCommand } from "../commands/economy";
import { PingCommand } from "../commands/general";
import { UserService } from "../user.service";

export class CommandRegisry {
  private commands = new Map<string, TwitchCommand>();

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {
    this.registerCommands();
  }

  private registerCommands(): void {
    const pingCmd = new PingCommand(this.chatbotService);
    const coinsCmd = new CoinsCommand(this.chatbotService, this.userService);

    this.commands.set(pingCmd.name, pingCmd);
    this.commands.set(coinsCmd.name, coinsCmd);

    Logger.info("CommandRegistry", "Twitch commands registered.");
  }

  public async execute(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ): Promise<void> {
    if (!text.startsWith("!")) return;

    const args = text.slice(1).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);

    if (command) {
      try {
        await command.execute({ channel, user, text, msg });
        Logger.debug(
          "CommandRegistry",
          `Executed command: !${commandName} by ${user}`,
        );
      } catch (error) {
        Logger.error(
          "CommandRegistry",
          `Error executing !${commandName} by ${user}`,
          error,
        );
      }
    } else {
      Logger.debug("CommandRegistry", `Unknown command: !${commandName}`);
    }
  }
}
