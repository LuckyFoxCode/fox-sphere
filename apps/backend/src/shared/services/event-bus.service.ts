import {
  LotteryFinishedPayload,
  LotteryNoParticipantsPayload,
  LotteryStartedPayload,
  LotteryTicketEarnedPayload,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
  TwitchFollowPayload,
  TwitchRaidPayload,
  TwitchRewardPayload,
  UserCreatePayload,
  UserLevelUpPayload,
} from "@fox-sphere/types";
import EventEmitter from "events";

interface AppEvents {
  "lottery:started": LotteryStartedPayload;
  "lottery:no-participants": LotteryNoParticipantsPayload;
  "lottery:ticket-earned": LotteryTicketEarnedPayload;
  "lottery:winners": {
    oldWinners: LotteryUserDto[];
    newWinners: LotteryUserDto[];
    participants: LotteryUserDto[];
  };
  "lottery:winner-drawn": LotteryWinnerDrawnPayload;
  "lottery:finished": LotteryFinishedPayload;
  "twitch:follow": TwitchFollowPayload;
  "twitch:raid": TwitchRaidPayload;
  "twitch:reward-redeem": TwitchRewardPayload;
  "user:created": UserCreatePayload;
  "user:level-up": UserLevelUpPayload;
}

class TypedEventBus extends EventEmitter {
  override emit<K extends keyof AppEvents>(
    eventName: K,
    data: AppEvents[K],
  ): boolean {
    return super.emit(eventName, data);
  }

  override on<K extends keyof AppEvents>(
    eventName: K,
    listener: (data: AppEvents[K]) => void,
  ): this {
    return super.on(eventName, listener);
  }
}

export const globalEventBus = new TypedEventBus();
