import {
  HeroAssignedPayload,
  LotteryFinishedPayload,
  LotteryNoParticipantsPayload,
  LotteryParticipantsPayload,
  LotteryStartedPayload,
  LotteryTicketEarnedPayload,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
  ProfileShowPayload,
  RouletteSpinResultPayload,
  StreamGetSystemStatePayload,
  StreamJackpotUpdatePayload,
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
import type { FishCatch } from "@fox-sphere/backend-shared";
import EventEmitter from "events";

export interface AppEvents {
  "chat:message": TwitchChatMessagePayload;
  // Исход несёт сама поклёвка: команды `!тянуть` больше нет, и `catch` — единственное, что
  // слушатель может превратить в строку чата. `empty` означает «сорвалась», а не «зритель
  // не успел»: окно ответа удалено вместе с командой.
  "fish:bite": { channel: string; username: string; catch: FishCatch };
  "hero:assigned": HeroAssignedPayload;
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
  "profile:show": ProfileShowPayload;
  "roulette:spun": RouletteSpinResultPayload;
  "stream:xp-updated": StreamXpUpdatePayload;
  "stream:xp-boost": StreamXpBoostPayload;
  "stream:level-up": StreamLevelUpPayload;
  "stream:jackpot-updated": StreamJackpotUpdatePayload;
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
