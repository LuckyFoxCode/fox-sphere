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
  color: string;
  title: string;
}

export interface TwitchServerToClientEvents {
  "twitch:add-vip": (data: TwitchAddVipPaylod) => void;
  "twitch:follow": (data: TwitchFollowPayload) => void;
  "twitch:raid": (data: TwitchRaidPayload) => void;
  "twitch:reward-redeem": (data: TwitchRewardPayload) => void;
  "twitch:timer": (data: TwitchTimerPayload) => void;
}
export interface TwitchClientToServerEvents {}
