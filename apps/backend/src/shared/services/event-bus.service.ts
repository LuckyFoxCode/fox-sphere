import EventEmitter from "events";

interface AppEvents {
  "twitch:follow": { userId: string; username: string };
  "twitch:reward-redeem": {
    userId: string;
    username: string;
    rewardTitle: string;
  };
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
