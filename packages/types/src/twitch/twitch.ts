// Данные событий (Payloads)
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

export interface TwitchServerToClientEvents {
  "twitch:follow": (data: TwitchFollowPayload) => void;
  "twitch:raid": (data: TwitchRaidPayload) => void;
  "twitch:reward-redeem": (data: TwitchRewardPayload) => void;
}
export interface TwitchClientToServerEvents {}
