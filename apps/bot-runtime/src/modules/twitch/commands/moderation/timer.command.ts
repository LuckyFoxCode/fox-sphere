import { WIDGET_VARIANTS, WidgetVariant } from "@fox-sphere/types";
import { globalEventBus } from "../../../../shared/services";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class TimerCommand implements TwitchCommand {
  readonly name = "timer";
  readonly alliases = ["counter", "таймер"];
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "global" as const,
  };

  constructor(private chatbotService: ChatbotService) {}

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.msg.userInfo.isBroadcaster && !ctx.msg.userInfo.isMod) {
      const message = BOT_MESSAGES.COMMANDS.DENIED(ctx.user);
      await this.chatbotService.sendMessage(ctx.channel, message);
      return;
    }

    const time = Number(ctx.args[0] ?? 1);

    if (isNaN(time) || time <= 0) {
      const message = BOT_MESSAGES.COMMANDS.TIMER_WARNING(ctx.user);
      await this.chatbotService.sendMessage(ctx.user, message);
      return;
    }

    function isValidWidgetVariant(value: string): value is WidgetVariant {
      return WIDGET_VARIANTS.includes(value as WidgetVariant);
    }

    const colorInput = ctx.args[1];

    const color: WidgetVariant =
      colorInput && isValidWidgetVariant(colorInput) ? colorInput : "blue";

    const title = ctx.args.slice(2).join(" ") || "Timer";

    globalEventBus.emit("twitch:timer", { time, color, title });

    const message = BOT_MESSAGES.COMMANDS.TIMER_SUCCESS(ctx.user, time, title);
    await this.chatbotService.sendMessage(ctx.user, message);
  }
}
