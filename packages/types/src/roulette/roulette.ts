export type RoulettePrizeType = "empty" | "coins" | "xp" | "jackpot";

// Длительность вращения колеса рулетки на оверлее. Общий контракт:
// бот ждёт столько же перед отправкой чат-сообщения, чтобы ответ в чат
// (твич + чат-виджет оверлея) приходил в момент остановки колеса.
export const ROULETTE_SPIN_ANIMATION_MS = 5000;

// Сколько держится подпись с выигрышем под колесом после остановки.
export const ROULETTE_RESULT_SHOW_MS = 4000;

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
