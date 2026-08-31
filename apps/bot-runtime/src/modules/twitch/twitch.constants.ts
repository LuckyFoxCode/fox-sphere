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
  LURK_COMMAND: 300000,
  PIVO_COMMAND: 60000,
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
    HELP: `🔮 FoxSphere • Commands: !coins • Fun: !lurk • !pivo | Info: !gh • !tg • !stack • !project • !version ➔ Type any command for details! 🚀`,
    VERSION: (version: string) =>
      `🦊 FoxSphere is running version ${version}! 🚀`,
    LURK: [
      (username: string) =>
        `🦊 @${username} slips into the fox den to lurk. Enjoy the vibes!`,
      (username: string) =>
        `🌙 @${username} curls up on the couch. We'll keep a seat warm!`,
      (username: string) =>
        `👀 @${username} watches from the shadows... we see you! 💚`,
      (username: string) =>
        `☕ Lights off, snacks ready — @${username} went full lurk mode! 🚀`,
      (username: string) =>
        `🛋️ Welcome to lurk life, @${username}! Hydrate and enjoy 💧`,
    ],
    PIVO: [
      (username: string) =>
        `🍺 @${username} cracks open a cold one. Cheers!`,
      (username: string) =>
        `🍻 @${username} raises a toast to the Sphere! 🦊`,
      (username: string) =>
        `🧊 Drinks on @${username}! Chat, say thanks!`,
      (username: string) =>
        `🍺 @${username} shares a round with the whole chat. Salud!`,
      (username: string) =>
        `⚡ A wild beer appears! @${username} picked it up. It's super effective!`,
    ],
    PIVO_GOLDEN: (username: string) =>
      `👑✨ GOLDEN BEER! @${username} found the legendary brew! 🍺`,
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
    XPBOOST_SUCCESS: (username: string, minutes: number, multiplier: number) =>
      `⚡ @${username} activated an XP ×${multiplier} boost for ${minutes} minutes! 🚀`,
    XPBOOST_WARNING: (username: string) =>
      `@${username}, usage: !xpboost <5-60> — duration in minutes.`,
    XPBOOST_CANCEL: (username: string) =>
      `⚡ @${username} cancelled the XP boost! 🛑`,
    XPBOOST_NO_ACTIVE: (username: string) =>
      `@${username}, there is no active XP boost to cancel.`,
  },
  // Награды за баллы канала (Channel Points)
  REWARDS: {
    COIN_EXCHANGE: (username: string, amount: number) =>
      `💰 @${username} exchanged Channel Points for ${amount} Coins! Wallet updated! 🪙`,
    LEADERBOARD: (_username: string, topList: string) =>
      `🏆 LEADERBOARD: ➔ ${topList}`,
    USER_STATS: (
      username: string,
      lvl: number,
      currentXp: number,
      nextLevelXp: number,
    ) =>
      `✨ @${username}'s STATS:   ⭐ Level: ${lvl}   🛡️   XP: ${currentXp} / ${nextLevelXp}   🚀`,
  },
} as const;
