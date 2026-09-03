import { PokemonPoolItem } from "../pokemon/pokemon.js";
import { WidgetVariant } from "./variants.js";

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
}

export interface TwitchTimerPayload {
  time: number;
  color: WidgetVariant;
  title: string;
}

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
  pokemon?: PokemonPoolItem;
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

export interface TwitchServerToClientEvents {
  "chat:message": (data: TwitchChatMessagePayload) => void;
  "twitch:add-vip": (data: TwitchAddVipPaylod) => void;
  "twitch:follow": (data: TwitchFollowPayload) => void;
  "twitch:raid": (data: TwitchRaidPayload) => void;
  "twitch:reward-redeem": (data: TwitchRewardPayload) => void;
  "twitch:timer": (data: TwitchTimerPayload) => void;
  "twitch:timer-stop": () => void;
  "twitch:watch-streak": (data: TwitchWatchStreakPayload) => void;
}
export interface TwitchClientToServerEvents {}
