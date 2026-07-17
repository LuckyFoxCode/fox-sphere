import {
  LotteryFinishedPayload,
  LotteryNoParticipantsPayload,
  LotteryParticipantsPayload,
  LotteryStartedPayload,
  LotteryTicketEarnedPayload,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
  StreamLevelUpPayload,
  StreamXpUpdatePayload,
  TwitchAddVipPaylod,
  TwitchFollowPayload,
  TwitchRaidPayload,
  TwitchRemoveVipPaylod,
  TwitchRewardPayload,
  TwitchTimerPayload,
  UserCreatePayload,
  UserLevelUpPayload,
} from "@fox-sphere/types";
import EventEmitter from "events";

interface AppEvents {
  "lottery:started": LotteryStartedPayload;
  "lottery:participants": LotteryParticipantsPayload;
  "lottery:no-participants": LotteryNoParticipantsPayload;
  "lottery:ticket-earned": LotteryTicketEarnedPayload;
  "lottery:winners": {
    oldWinners: LotteryUserDto[];
    newWinners: LotteryUserDto[];
    participants: LotteryUserDto[];
  };
  "lottery:winner-drawn": LotteryWinnerDrawnPayload;
  "lottery:finished": LotteryFinishedPayload;
  "stream:xp-updated": StreamXpUpdatePayload;
  "stream:level-up": StreamLevelUpPayload;
  "twitch:add-vip": TwitchAddVipPaylod;
  "twitch:follow": TwitchFollowPayload;
  "twitch:raid": TwitchRaidPayload;
  "twitch:remove-vip": TwitchRemoveVipPaylod;
  "twitch:reward-redeem": TwitchRewardPayload;
  "twitch:timer": TwitchTimerPayload;
  "twitch:timer-stop": Record<string, never>;
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
