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
  GENERAL_COMMAND: 10000,
};

export const BOT_MESSAGES = {
  // Системные события (стрим-алерты)
  ALERTS: {
    LEVEL_UP_USER: (username: string, newLevel: number) =>
      `⚡ @${username} leveled up to Level ${newLevel}! 🚀 GG!`,
    LEVEL_UP_STREAM: (newLevel: number) =>
      `⚡ STREAM LEVEL UP! We are now Level ${newLevel}! Keep spamming those messages! 🚀`,

    FOLLOW: (username: string) =>
      `🎉 Thanks for the follow, @${username}! Welcome to the Foxsphere family! 🚀`,

    RAID: (raiderName: string, viewers: number) =>
      `⚡ @${raiderName} just raided with ${viewers} viewers! Welcome to the Sphere! 🦊🌐✨`,
  },

  // Текстовые команды из чата (!coins и т.д.)
  COMMANDS: {
    WALLET_BALANCE: (username: string, coins: number) =>
      `💰 Wallet • @${username} ➔ ${coins} Coins 🪙`,
    GH: `🚀 GitHub • Follow my dev journey and explore the code: https://github.com/LuckyFoxCode 🌐`,
    TG: `📢 Telegram • Join for weekly devlogs, project updates, and live announcements: https://t.me/TheCodingFox 🦊🌐`,
    STACK: `💻 Tech Stack • Express / TypeScript • Vue 3 / TailwindCSS • PostgreSQL / Prisma / Docker ⚙️`,
    PROJECT: `🛠️ Current Project • FoxSphere: A custom Full-Stack Twitch interactive & gamification platform built from scratch (Vue 3 / Express / Postgres / Docker) to level up my dev skills live! 🦊🔮`,
    HELP: `🔮 FoxSphere • Commands: !coins | Info: !gh • !tg • !stack • !project ➔ Type any command for details! 🚀`,
    POINTS: `🪙 Economy • Channel Points automatically integrate with FoxSphere rewards. Earn Coins by watching and save them to unlock custom interactive features in the future! 🔮`,
    DENIED: (username: string) =>
      `@${username}, you don't have permission to use this command!`,
    ADD_VIP: (moderator: string, username: string) =>
      `🎉 NEW VIP ALERT! 🎉 @${moderator} has just made @${username} a VIP! Drop some hype in the chat! 💎✨`,
    ADD_VIP_WARNING: (username: string) =>
      `@${username}, please specify a username: !addvip <username>`,
    ADD_VIP_NOTFOUND: (username: string) =>
      `User @${username} not found on Twitch.`,
    REMOVE_VIP: (moderator: string, username: string) =>
      `✨ VIP status removed: @${moderator} has updated @${username}'s permissions.`,
    REMOVE_VIP_WARNING: (username: string) =>
      `@${username}, please specify a username: !removevip <username>`,
    REMOVE_VIP_NOTFOUND: (username: string) =>
      `User @${username} not found on Twitch.`,
    TIMER_SUCCESS: (username: string, time: number, title: string) =>
      `@${username}, timer "${title || "Timer"}" started for ${time} minutes! ⏳`,
    TIMER_WARNING: (username: string) =>
      `@${username}, time must be a number! Example: !timer 60 cyan My cool timer`,
    TIMER_STOP: (username: string) => `@${username}, timer stopped. ⏹️`,
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
