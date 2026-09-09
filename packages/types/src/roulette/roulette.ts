export type RoulettePrizeType = "empty" | "coins" | "xp" | "jackpot";

export interface RouletteSpinResultPayload {
  userId: string;
  username: string;
  prizeType: RoulettePrizeType;
  coinAmount: number;
  xpAmount: number;
  jackpotWon: boolean;
  jackpotTotalAfter: number;
}

export interface RouletteServerToClientEvents {
  "roulette:spin-result": (data: RouletteSpinResultPayload) => void;
}

export interface RouletteClientToServerEvents {}
