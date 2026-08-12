import { BOOST_CONFIG, StreamService } from "../../../stream";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES } from "../../twitch.constants";
import { CommandContext, TwitchCommand } from "../command.interface";

export class XpBoostCommand implements TwitchCommand {
  readonly name = "xpboost";

  constructor(
    private chatbotService: ChatbotService,
    private streamService: StreamService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.msg.userInfo.isBroadcaster && !ctx.msg.userInfo.isMod) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        BOT_MESSAGES.COMMANDS.DENIED(ctx.user),
      );
      return;
    }

    const raw = ctx.args[0];
    const minutes =
      raw === undefined ? BOOST_CONFIG.DEFAULT / 60_000 : Number(raw);

    if (
      Number.isNaN(minutes) ||
      minutes * 60_000 < BOOST_CONFIG.MIN ||
      minutes * 60_000 > BOOST_CONFIG.MAX
    ) {
      await this.chatbotService.sendMessage(
        ctx.channel,
        BOT_MESSAGES.COMMANDS.XPBOOST_WARNING(ctx.user),
      );
      return;
    }

    await this.streamService.activateXpBoost({
      multiplier: BOOST_CONFIG.MULTIPLIER,
      durationMs: minutes * 60_000,
      source: "command",
    });

    await this.chatbotService.sendMessage(
      ctx.channel,
      BOT_MESSAGES.COMMANDS.XPBOOST_SUCCESS(ctx.user, minutes),
    );
  }
}
