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

export const BOT_MESSAGES = {
  // Системные события (стрим-алерты)
  ALERTS: {
    LEVEL_UP: (username: string, newLevel: number) =>
      `⚡ @${username} leveled up to Level ${newLevel}! 🚀 GG!`,

    FOLLOW: (username: string) =>
      `🎉 Thanks for the follow, @${username}! Welcome to the Foxsphere family! 🚀`,

    RAID: (raiderName: string, viewers: number) =>
      `⚡ @${raiderName} just raided with ${viewers} viewers! Welcome to the Sphere! 🦊🌐✨`,
  },

  // Текстовые команды из чата (!coins и т.д.)
  COMMANDS: {
    WALLET_BALANCE: (username: string, coins: number) =>
      `💰 Wallet • @${username} ➔ ${coins} Coins 🪙`,
  },

  // Награды за баллы канала (Channel Points)
  REWARDS: {
    COIN_EXCHANGE: (username: string, amount: number) =>
      `💰 @${username} exchanged Channel Points for ${amount} Coins! Wallet updated! 🪙`,
    LEADERBOARD: (username: string, topList: string) =>
      `🏆 LEADERBOARD (Ordered by @${username}) 🏆   ➔   ${topList}`,
    USER_STATS: (
      username: string,
      lvl: number,
      currentXp: number,
      nextLevelXp: number,
    ) =>
      `✨ @${username}'s STATS:   ⭐ Level: ${lvl}   🛡️   XP: ${currentXp} / ${nextLevelXp}   🚀`,
  },
} as const;
