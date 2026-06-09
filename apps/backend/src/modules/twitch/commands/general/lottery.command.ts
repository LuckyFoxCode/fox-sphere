import { COOLDOWNS, UserService } from "../../../user";
import { ChatbotService } from "../../chatbot.service";
import { BOT_MESSAGES } from "../../twitch.constants";
import {
  CommandContext,
  CooldownConfig,
  TwitchCommand,
} from "../command.interface";

export class LotteryCommand implements TwitchCommand {
  readonly name = "runlottery";
  readonly alliases = ["lottery", "лотерея"];

  readonly cooldown: CooldownConfig = {
    time: COOLDOWNS.XP_LOTTERY_COOLDOWN,
    type: "user" as const,
  };

  constructor(
    private chatbotService: ChatbotService,
    private userService: UserService,
  ) {}

  async execute(ctx: CommandContext): Promise<void> {
    const broadcater = ctx.msg.userInfo.isBroadcaster;

    if (!broadcater) return;

    const message = BOT_MESSAGES.LOTTERY.START_ROLL();
    await this.chatbotService.sendMessage(ctx.channel, message);
    await this.userService.triggerLottery();
  }
}
