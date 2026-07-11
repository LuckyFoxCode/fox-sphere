import { globalEventBus } from "../../../../shared/services";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class TimerStopCommand implements TwitchCommand {
  readonly name = "timer-stop";
  readonly alliases = ["timer-remove", "timer-r", "таймер-стоп"];
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

    globalEventBus.emit("twitch:timer-stop", {});
    const message = BOT_MESSAGES.COMMANDS.TIMER_STOP(ctx.user);
    await this.chatbotService.sendMessage(ctx.channel, message);
  }
}
