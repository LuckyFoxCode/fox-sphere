// Сущность (Data Transfer Object)
export interface LotteryUserDto {
  twitchId: string;
  username: string;
}

// Данные событий (Payloads)
export interface LotteryStartedPayload {
  duration: number;
}

export interface LotteryNoParticipantsPayload {
  oldWinners: LotteryUserDto[];
}

export interface LotteryFinishedPayload {
  winners: LotteryUserDto[];
}

export interface LotteryTicketEarnedPayload {
  twitchId: string;
  username: string;
}

export type LotteryParticipantsPayload = LotteryTicketEarnedPayload;

export interface LotteryWinnersPayload {
  oldWinners: LotteryUserDto[];
  newWinners: LotteryUserDto[];
  participants: LotteryUserDto[];
}

export interface LotteryWinnerDrawnPayload extends LotteryUserDto {
  place: number;
}
export interface LotteryServerToClientEvents {
  "lottery:ticket-earned": (data: LotteryTicketEarnedPayload) => void;
  "lottery:started": (data: LotteryStartedPayload) => void;
  "lottery:winner-drawn": (data: LotteryWinnerDrawnPayload) => void;
  "lottery:finished": (data: LotteryFinishedPayload) => void;
  "lottery:participants": (data: LotteryParticipantsPayload) => void;
}

export interface LotteryClientToServerEvents {}
