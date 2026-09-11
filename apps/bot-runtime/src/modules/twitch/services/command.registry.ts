import { config, Logger } from "@fox-sphere/backend-shared";
import { ApiClient } from "@twurple/api";
import { ChatMessage } from "@twurple/chat";
import { RouletteService } from "../../roulette";
import { StreamService } from "../../stream";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import { CommandError, TwitchCommand } from "../commands/command.interface";
import { CoinsCommand, SpinCommand, SpinStatsCommand } from "../commands/economy";
import {
  GitHubCommand,
  HelpCommand,
  LurkCommand,
  PivoCommand,
  PointsCommand,
  ProjectCommand,
  StackCommand,
  TelegramCommand,
  VersionCommand,
} from "../commands/general";
import {
  LotteryCommand,
  TicketCommand,
  TicketsCommand,
} from "../commands/lottery";
import {
  AddVipCommand,
  RemoveVipCommand,
  TimerCommand,
  TimerStopCommand,
  XpBoostCommand,
} from "../commands/moderation";

export class CommandRegisry {
  private commands = new Map<string, TwitchCommand>();
  private globalCooldowns = new Set<string>();
  private userCooldowns = new Map<string, Map<string, { expiresAt: number; notified: boolean }>>();

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private streamService: StreamService,
    private apiClient: ApiClient,
    private rouletteService: RouletteService,
  ) {
    this.registerCommands();
  }

  private registerCommands(): void {
    const commandToRegister: TwitchCommand[] = [
      new CoinsCommand(this.chatbotService, this.userService),
      new SpinCommand(this.chatbotService, this.userService, this.rouletteService),
      new SpinStatsCommand(this.chatbotService, this.userService),
      new GitHubCommand(this.chatbotService),
      new HelpCommand(this.chatbotService),
      new LotteryCommand(this.userService),
      new LurkCommand(this.chatbotService),
      new PivoCommand(this.chatbotService),
      new PointsCommand(this.chatbotService),
      new ProjectCommand(this.chatbotService),
      new StackCommand(this.chatbotService),
      new TelegramCommand(this.chatbotService),
      new VersionCommand(this.chatbotService),
      new TicketCommand(this.chatbotService),
      new TicketsCommand(this.chatbotService),
      new TimerCommand(this.chatbotService),
      new TimerStopCommand(this.chatbotService),
      new XpBoostCommand(this.chatbotService, this.streamService),
      new AddVipCommand(this.chatbotService, this.userService, this.apiClient),
      new RemoveVipCommand(
        this.chatbotService,
        this.userService,
        this.apiClient,
      ),
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

  // Ставит кулдаун сразу, до запуска execute — закрывает гонку между
  // проверкой и установкой, пока команда выполняется.
  private reserveCooldown(command: TwitchCommand, userId: string): void {
    const cooldown = command.cooldown;
    if (!cooldown) return;

    if (cooldown.type === "global") {
      this.globalCooldowns.add(command.name);
      setTimeout(
        () => this.globalCooldowns.delete(command.name),
        cooldown.time,
      );
      return;
    }

    if (!this.userCooldowns.has(userId)) {
      this.userCooldowns.set(userId, new Map());
    }
    this.userCooldowns.get(userId)!.set(command.name, {
      expiresAt: Date.now() + cooldown.time,
      notified: false,
    });
    setTimeout(
      () => this.userCooldowns.get(userId)?.delete(command.name),
      cooldown.time,
    );
  }

  // Откатывает резерв при ошибке команды — попытка с ошибкой не тратит кулдаун.
  private releaseCooldown(command: TwitchCommand, userId: string): void {
    const cooldown = command.cooldown;
    if (!cooldown) return;

    if (cooldown.type === "global") {
      this.globalCooldowns.delete(command.name);
      return;
    }

    this.userCooldowns.get(userId)?.delete(command.name);
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
      const isOnCooldown =
        type === "global"
          ? this.globalCooldowns.has(command.name)
          : this.userCooldowns.get(userId)?.has(command.name) ?? false;

      if (isOnCooldown) {
        const entry = this.userCooldowns.get(userId)?.get(command.name);
        if (entry && command.cooldown.notifyMessage && !entry.notified) {
          const remainingSeconds = Math.ceil(
            (entry.expiresAt - Date.now()) / 1000,
          );
          await this.chatbotService.sendMessage(
            channel,
            command.cooldown.notifyMessage(user, remainingSeconds),
          );
          entry.notified = true;
        }
        Logger.debug(
          "CommandRegistry",
          `Ignored ${type} spam for ${config.commandPrefix}${commandName} from ${user}`,
        );
        return;
      }

      // Резервирование кулдауна ДО execute: длинные команды (спин ждёт анимацию
      // колеса на оверлее) иначе оставляют окно, в котором спам проходит проверку
      // и исполняется повторно.
      this.reserveCooldown(command, userId);
    }

    try {
      await command.execute({ channel, user, text, msg, args });
      Logger.debug(
        "CommandRegistry",
        `── ⟡ ˙🌱 ̟ Executed command: ${config.commandPrefix}${commandName} by ${user}`,
      );
    } catch (error) {
      // Неудачная попытка не съедает кулдаун — как и раньше, он ставился
      // только по успешному завершению команды.
      if (command.cooldown) {
        this.releaseCooldown(command, userId);
      }

      if (error instanceof CommandError) {
        Logger.debug(
          "CommandRegistry",
          `Command returned user-facing error: ${config.commandPrefix}${commandName}`,
        );
        try {
          await this.chatbotService.sendMessage(channel, error.message);
        } catch (sendError) {
          Logger.error(
            "CommandRegistry",
            `Failed to send CommandError message for ${config.commandPrefix}${commandName}`,
            sendError,
          );
        }
        return;
      }

      Logger.error(
        "CommandRegistry",
        `Error executing ${config.commandPrefix}${commandName} by ${user}`,
        error,
      );
    }
  }
}
