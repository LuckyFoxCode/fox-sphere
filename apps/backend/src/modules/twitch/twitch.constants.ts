// Настройки отображения лидерборда
export const LEADERBOARD_MARKERS = [
  "👑 1st",
  "⭐ 2nd",
  "✨ 3rd",
  "🔹 4th",
  "🔹 5th",
];
export const LEADERBOARD_LIMIT = 5;

// Награды за баллы канала (Channel Point Rewards)
export const REWARD_TITLES = {
  LEADERBOARD: "Flex Leaderboard",
  STATS: "Check My Stats",
  COIN_EXCHANGE: "Coin Exchange",
} as const;

// Экономика: Коины
export const COINS_EXCHANGE_AMOUNT = 10;

// Таймеры и задержки (в миллисекундах)
export const COOLDOWNS = {
  COINS_COMMAND: 5000,
  ANNOUNCEMENT_QUEUE: 2000,
};
