// Сущность (Data Transfer Object)
export interface TwitchUserDto {
  twitchId: string;
  username: string;
}

// Данные событий (Payloads)
export interface LotteryStartedPayload {
  duration: number;
}

export interface LotteryNoParticipantsPayload {
  oldWinners: TwitchUserDto[];
}

export interface LotteryFinishedPayload {
  winners: TwitchUserDto[];
}

export interface LotteryTicketEarnedPayload {
  twitchId: string;
  username: string;
}

export interface LotteryWinnersPayload {
  oldWinners: TwitchUserDto[];
  newWinners: TwitchUserDto[];
  participants: TwitchUserDto[];
}

export interface LotteryWinnerDrawnPayload extends TwitchUserDto {
  place: number;
}
export interface ServerToClientEvents {
  "lottery:started": (data: LotteryStartedPayload) => void;
  "lottery:winner-drawn": (data: LotteryWinnerDrawnPayload) => void;
  "lottery:finished": (data: LotteryFinishedPayload) => void;
}

export interface ClientToServerEvents {}
