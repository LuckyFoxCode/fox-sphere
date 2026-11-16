import { HeroRef } from "../hero/hero";
import { WidgetVariant } from "./variants";

export type TwitchAnnouncementColor = "blue" | "green" | "orange" | "purple";

export interface TwitchWatchStreakInfo {
  value: number;
  reward: number;
}

// Данные событий (Payloads)
export interface TwitchAddVipPaylod {
  twitchId: string;
  username: string;
}

export type TwitchRemoveVipPaylod = TwitchAddVipPaylod;

export interface TwitchFollowPayload {
  userId: string;
  username: string;
}

export interface TwitchRaidPayload {
  raiderId: string;
  raiderName: string;
  viewers: number;
}

export interface TwitchRewardPayload {
  userId: string;
  username: string;
  rewardTitle: string;
  redemptionId: string;
}

/**
 * Живой `!timer` в том виде, в котором он лежит в `SystemState`.
 *
 * `endsAt` — абсолютный момент окончания в epoch-миллисекундах, а не остаток:
 * остатка не хватает, чтобы пережить перезагрузку сцены OBS, второй открытый
 * оверлей или рестарт бота. Остаток каждая копия оверлея считает сама от часов
 * машины, поэтому и дрейф от троттлинга `setInterval` не накапливается.
 */
export interface ActiveStreamTimer {
  title: string;
  color: WidgetVariant;
  endsAt: number;
}

export type TwitchTimerPayload = ActiveStreamTimer;

export type TwitchGetTimerPayload = Record<string, never>;

export interface TwitchChatMessagePayload {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  color: string;
  text: string;
  badges: string[];
  emotes: Record<string, string[]>;
  timestamp: number;
  hero?: HeroRef;
  userLvl: number;
  isMod: boolean;
  isFollower: boolean;
  isFounder: boolean;
  isSubscriber: boolean;
  isVip: boolean;
  isPermanentVip: boolean;
  isBroadcaster: boolean;
  isBot: boolean;
  isHighlight: boolean;
  isAction: boolean;
  isAnnouncement?: boolean;
  announceColor?: TwitchAnnouncementColor;
  watchStreak?: TwitchWatchStreakInfo;
}

export interface TwitchWatchStreakPayload {
  userId: string;
  username: string;
  displayName: string;
  streakValue: number;
  xpAwarded: number;
  coinsAwarded: number;
  isRepeat: boolean;
}

export interface TwitchGoldenBeerPayload {
  userId: string;
  username: string;
  displayName: string;
  goldenBeers: number;
  tier: number;
  isNewTier: boolean;
}

export interface TwitchServerToClientEvents {
  "chat:message": (data: TwitchChatMessagePayload) => void;
  "twitch:add-vip": (data: TwitchAddVipPaylod) => void;
  "twitch:follow": (data: TwitchFollowPayload) => void;
  "twitch:raid": (data: TwitchRaidPayload) => void;
  "twitch:reward-redeem": (data: TwitchRewardPayload) => void;
  "twitch:timer": (data: TwitchTimerPayload) => void;
  "twitch:timer-stop": () => void;
  "twitch:watch-streak": (data: TwitchWatchStreakPayload) => void;
  "twitch:golden-beer": (data: TwitchGoldenBeerPayload) => void;
}
export interface TwitchClientToServerEvents {
  /**
   * Что показывать в таймере прямо сейчас. Актуален только после коннекта:
   * живое событие несёт `endsAt` само, а этот запрос нужен перезагруженной
   * сцене, чтобы догнать идущий таймер. `null` — таймера нет или он истёк.
   */
  "twitch:get-timer": (
    _data: TwitchGetTimerPayload,
    callback: (timer: ActiveStreamTimer | null) => void,
  ) => void;
}
