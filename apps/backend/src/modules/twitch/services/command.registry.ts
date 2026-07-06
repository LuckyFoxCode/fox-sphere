import { ChatMessage } from "@twurple/chat";
import { config } from "../../../shared/config";
import { Logger } from "../../../shared/services/logger.service";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import { TwitchCommand } from "../commands/command.interface";
import { CoinsCommand } from "../commands/economy";
import {
  GitHubCommand,
  HelpCommand,
  LotteryCommand,
  PointsCommand,
  ProjectCommand,
  StackCommand,
  TelegramCommand,
} from "../commands/general";

export class CommandRegisry {
  private commands = new Map<string, TwitchCommand>();
  private globalCooldowns = new Set<string>();
  private userCooldowns = new Map<string, Set<string>>();

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {
    this.registerCommands();
  }

  private registerCommands(): void {
    const commandToRegister: TwitchCommand[] = [
      new CoinsCommand(this.chatbotService, this.userService),
      new GitHubCommand(this.chatbotService),
      new HelpCommand(this.chatbotService),
      new LotteryCommand(this.chatbotService, this.userService),
      new PointsCommand(this.chatbotService),
      new ProjectCommand(this.chatbotService),
      new StackCommand(this.chatbotService),
      new TelegramCommand(this.chatbotService),
    ];

    for (const command of commandToRegister) {
      this.commands.set(command.name.toLowerCase(), command);

      if (command.alliases) {
        for (const allias of command.alliases) {
          this.commands.set(allias.toLowerCase(), command);
        }
      }
    }

    Logger.info("CommandRegistry", "Twitch commands registered.");
  }

  public async execute(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ): Promise<void> {
    if (!text.startsWith(config.commandPrefix)) return;

    const args = text.slice(config.commandPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);

    if (!command) {
      Logger.debug(
        "CommandRegistry",
        `Unknown command: ${config.commandPrefix}${commandName}`,
      );
      return;
    }

    const userId = msg.userInfo.userId;

    if (command.cooldown) {
      const { type } = command.cooldown;

      if (type === "global" && this.globalCooldowns.has(command.name)) {
        Logger.debug(
          "CommandRegistry",
          `Ignored global spam for ${config.commandPrefix}${commandName}`,
        );
        return;
      }

      if (
        type === "user" &&
        this.userCooldowns.get(userId)?.has(command.name)
      ) {
        Logger.debug(
          "CommandRegistry",
          `Ignored user spam for ${config.commandPrefix}${commandName} from ${user}`,
        );
        return;
      }
    }

    try {
      await command.execute({ channel, user, text, msg });
      Logger.debug(
        "CommandRegistry",
        `── ⟡ ˙🌱 ̟ Executed command: ${config.commandPrefix}${commandName} by ${user}`,
      );

      if (command.cooldown) {
        const { time, type } = command.cooldown;
        if (type === "global") {
          this.globalCooldowns.add(command.name);
          setTimeout(() => this.globalCooldowns.delete(command.name), time);
        } else if (type === "user") {
          if (!this.userCooldowns.has(userId)) {
            this.userCooldowns.set(userId, new Set());
          }
          this.userCooldowns.get(userId)!.add(command.name);
          setTimeout(
            () => this.userCooldowns.get(userId)?.delete(command.name),
            time,
          );
        }
      }
    } catch (error) {
      Logger.error(
        "CommandRegistry",
        `Error executing ${config.commandPrefix}${commandName} by ${user}`,
        error,
      );
    }
  }
}
