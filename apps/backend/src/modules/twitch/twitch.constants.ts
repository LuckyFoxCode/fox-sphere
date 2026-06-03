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

// Экономика: Коины и XP
export const COINS_EXCHANGE_AMOUNT = 10;
export const XP_REWARDS = {
  DEFAULT: 1,
  SUBSCRIBER: 3,
  BROADCASTER: 3,
  FOLLOWER: 2,
} as const;

// Таймеры и задержки (в миллисекундах)
export const COOLDOWNS = {
  COINS_COMMAND: 5000,
  ANNOUNCEMENT_QUEUE: 2000,
  CACHE_CLEAR_INTERVAL: 24 * 60 * 60 * 1000, // 24 часа
  XP_MESSAGE_COOLDOWN: 15 * 1000,
  COINS_CACHE_TTL: 10000,
};
