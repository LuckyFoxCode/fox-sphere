import { globalEventBus } from "../../../../shared/services";
import { UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES, COOLDOWNS } from "../../twitch.constants";
import {
  CommandContext,
  CommandError,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

// Цвет по умолчанию для зрителя без цвета в чате — тот же, что в `buildChatMessagePayload`.
const DEFAULT_COLOR = "#9146FF";

/**
 * Прототип `!profile` — просит `UserService` собрать карточку и отдаёт её оверлею.
 *
 * Команда не рисует ничего сама: она кладёт payload в шину, а `profile:show` доезжает до
 * оверлея тем же путём, что и остальные события. Строка в чате — одно подтверждение, без данных
 * карточки: цифры на экране не должны зависеть от того, успел ли чат.
 */
export class ProfileCommand implements TwitchCommand {
  readonly name = "profile";
  readonly alliases = ["профиль"];
  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.GENERAL_COMMAND,
    type: "user" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const twitchId = ctx.msg.userInfo.userId;

    const profile = await this.userService.getProfileCard(twitchId);

    // Возможно только если строка не создалась до команды; сообщение в чате тут полезнее,
    // чем пустая карточка с нулями.
    if (!profile) {
      throw new CommandError(BOT_MESSAGES.COMMANDS.PROFILE_NOT_FOUND(ctx.user));
    }

    globalEventBus.emit("profile:show", {
      ...profile,
      displayName: ctx.msg.userInfo.displayName,
      color: ctx.msg.userInfo.color || DEFAULT_COLOR,
      // From the message, not the row: the broadcaster has no column, and this tag is what
      // turns the card's level title into `GAME MASTER`.
      isBroadcaster: ctx.msg.userInfo.isBroadcaster,
    });

    await this.chatbotService.sendMessage(
      ctx.channel,
      BOT_MESSAGES.COMMANDS.PROFILE_SHOW(ctx.user),
    );
  }
}
