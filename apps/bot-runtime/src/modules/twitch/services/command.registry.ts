import { config, Logger } from "@fox-sphere/backend-shared";
import { ApiClient } from "@twurple/api";
import { ChatMessage } from "@twurple/chat";
import { resolveChannelContext } from "../../channel";
import { FishingService } from "../../fishing";
import { RouletteService } from "../../roulette";
import { StreamService } from "../../stream";
import { UserService } from "../../user";
import { ChatbotService } from "../chatbot.service";
import { CommandError, TwitchCommand } from "../commands/command.interface";
import {
  CoinsCommand,
  FishingCastCommand,
  SpinCommand,
  SpinStatsCommand,
} from "../commands/economy";
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

export class CommandRegistry {
  private commands = new Map<string, TwitchCommand>();
  private globalCooldowns = new Set<string>();
  private userCooldowns = new Map<string, Map<string, { expiresAt: number; notified: boolean }>>();

  // Per-viewer command cooldown, keyed by channel as well as by Twitch id.
  //
  // A bare `twitchId` key is the same defect the `ChannelUser` cutover removes one level up:
  // it reads correctly while the process serves one channel and then hands the second stream
  // another stream's cooldown state — one stream's viewer gets told "wait N seconds" for a
  // command they never ran. `UserCache` carries the same reasoning and the same key shape.
  private cooldownKeyFor = async (twitchId: string): Promise<string> => {
    const { channelId } = await resolveChannelContext();
    return `${channelId}:${twitchId}`;
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
    private streamService: StreamService,
    private apiClient: ApiClient,
    private rouletteService: RouletteService,
    private fishingService: FishingService,
  ) {
    this.registerCommands();
  }

  private registerCommands(): void {
    const commandToRegister: TwitchCommand[] = [
      new CoinsCommand(this.chatbotService, this.userService),
      new SpinCommand(this.chatbotService, this.userService, this.rouletteService),
      new SpinStatsCommand(this.chatbotService, this.userService),
      new FishingCastCommand(this.chatbotService, this.fishingService),
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
  private reserveCooldown(
    command: TwitchCommand,
    userCooldownKey: string | null,
  ): void {
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

    // Unreachable in practice: the global branch above returns first, and `execute` only gets
    // here with a key resolved. Kept so a future caller cannot write to a map named `""`.
    if (!userCooldownKey) return;

    if (!this.userCooldowns.has(userCooldownKey)) {
      this.userCooldowns.set(userCooldownKey, new Map());
    }
    this.userCooldowns.get(userCooldownKey)!.set(command.name, {
      expiresAt: Date.now() + cooldown.time,
      notified: false,
    });
    setTimeout(
      () => this.userCooldowns.get(userCooldownKey)?.delete(command.name),
      cooldown.time,
    );
  }

  // Откатывает резерв при ошибке команды — попытка с ошибкой не тратит кулдаун.
  private releaseCooldown(
    command: TwitchCommand,
    userCooldownKey: string | null,
  ): void {
    const cooldown = command.cooldown;
    if (!cooldown) return;

    if (cooldown.type === "global") {
      this.globalCooldowns.delete(command.name);
      return;
    }

    if (!userCooldownKey) return;

    this.userCooldowns.get(userCooldownKey)?.delete(command.name);
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

    // Resolved once per message, and only for a viewer-scoped cooldown: a global one is keyed by
    // command name alone and has no channel to carry. Inside the `try` because the resolver
    // throws on a deployment with no `Channel` row, and a command that cannot tell whose
    // cooldown it is checking should not run at all.
    let userCooldownKey: string | null = null;

    try {
      if (command.cooldown && command.cooldown.type !== "global") {
        userCooldownKey = await this.cooldownKeyFor(userId);
      }

      if (command.cooldown) {
        const { type } = command.cooldown;
        const entries = userCooldownKey
          ? this.userCooldowns.get(userCooldownKey)
          : undefined;
        const isOnCooldown =
          type === "global"
            ? this.globalCooldowns.has(command.name)
            : (entries?.has(command.name) ?? false);

        if (isOnCooldown) {
          const entry = entries?.get(command.name);
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
        this.reserveCooldown(command, userCooldownKey);
      }

      await command.execute({ channel, user, text, msg, args });
      Logger.debug(
        "CommandRegistry",
        `── ⟡ ˙🌱 ̟ Executed command: ${config.commandPrefix}${commandName} by ${user}`,
      );
    } catch (error) {
      // Неудачная попытка не съедает кулдаун — как и раньше, он ставился
      // только по успешному завершению команды.
      if (command.cooldown) {
        this.releaseCooldown(command, userCooldownKey);
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
