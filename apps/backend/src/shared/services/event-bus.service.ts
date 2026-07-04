import {
  LotteryFinishedPayload,
  LotteryNoParticipantsPayload,
  LotteryStartedPayload,
  LotteryTicketEarnedPayload,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
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
  "twitch:follow": { userId: string; username: string };
  "twitch:raid": { raiderId: string; raiderName: string; viewers: number };
  "twitch:reward-redeem": {
    userId: string;
    username: string;
    rewardTitle: string;
  };
  "user:created": { twitchId: string; username: string };
  "user:level-up": { userId: string; username: string; newLevel: number };
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
