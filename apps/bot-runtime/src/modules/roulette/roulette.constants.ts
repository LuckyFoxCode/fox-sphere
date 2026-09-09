import { JACKPOT_SEED } from "@fox-sphere/backend-shared";

export const ROULETTE_CONFIG = {
  PRICE: 100,
  JACKPOT_SHARE: 10,
  JACKPOT_SEED,
  SPIN_COOLDOWN: 60_000,
  SPIN_STATS_COOLDOWN: 5_000,
};

export const ROULETTE_MESSAGES = {
  NOT_ENOUGH_COINS: (username: string, need: number, have: number) =>
    `@${username}, не хватает монет: нужно ${need}, у тебя ${have}`,
  EMPTY_RESULT: (username: string) =>
    `🎲 @${username} крутил-крутил… и ничего 🎲`,
  COINS_RESULT: (username: string, coins: number) =>
    `💰 @${username} выловил ${coins} монет!`,
  XP_RESULT: (username: string, xp: number) =>
    `⚡ @${username} схватил ${xp} XP!`,
  JACKPOT_ANNOUNCE: (username: string) =>
    `👑 @${username} СРЫВАЕТ ДЖЕКПОТ!`,
  JACKPOT_RESULT: (username: string, amount: number, bank: number) =>
    `🎰 @${username} забирает ${amount} монет джекпота! Банк обновлён: ${bank}`,
  SPIN_STATS_ZERO: (username: string) =>
    `@${username}, ты ещё не крутил рулетку — жми !spin! 🎰`,
  SPIN_STATS: (username: string, spins: number, win: number, loss: number) =>
    `🎰 @${username}: крутанул ${spins} раз, выиграл ${win}, слил ${loss}`,
} as const;
