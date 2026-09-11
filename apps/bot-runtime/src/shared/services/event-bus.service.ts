import {
  LotteryFinishedPayload,
  LotteryNoParticipantsPayload,
  LotteryParticipantsPayload,
  LotteryStartedPayload,
  LotteryTicketEarnedPayload,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
  PokemonAssignedPayload,
  RouletteSpinResultPayload,
  StreamGetSystemStatePayload,
  StreamLevelUpPayload,
  StreamSystemStateResponse,
  StreamXpBoostPayload,
  StreamXpUpdatePayload,
  TwitchAddVipPaylod,
  TwitchChatMessagePayload,
  TwitchFollowPayload,
  TwitchRaidPayload,
  TwitchRemoveVipPaylod,
  TwitchRewardPayload,
  TwitchTimerPayload,
  TwitchWatchStreakPayload,
  UserCreatePayload,
  UserLevelUpPayload,
} from "@fox-sphere/types";
import EventEmitter from "events";

interface AppEvents {
  "chat:message": TwitchChatMessagePayload;
  "fish:bite": { channel: string; username: string };
  "fish:expired": { channel: string; username: string };
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
  "pokemon:assigned": PokemonAssignedPayload;
  "roulette:spun": RouletteSpinResultPayload;
  "stream:xp-updated": StreamXpUpdatePayload;
  "stream:xp-boost": StreamXpBoostPayload;
  "stream:level-up": StreamLevelUpPayload;
  "stream:get-system-state": {
    data: StreamGetSystemStatePayload;
    callback: (response: StreamSystemStateResponse) => void;
  };
  "twitch:add-vip": TwitchAddVipPaylod;
  "twitch:follow": TwitchFollowPayload;
  "twitch:raid": TwitchRaidPayload;
  "twitch:remove-vip": TwitchRemoveVipPaylod;
  "twitch:reward-redeem": TwitchRewardPayload;
  "twitch:timer": TwitchTimerPayload;
  "twitch:timer-stop": Record<string, never>;
  "twitch:watch-streak": TwitchWatchStreakPayload;
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
