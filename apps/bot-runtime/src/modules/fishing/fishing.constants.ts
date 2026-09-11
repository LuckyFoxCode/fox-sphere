export const FISHING_CONFIG = {
  CAST_COOLDOWN_MS: 60_000,
  BITE_DELAY_MIN_MS: 10_000,
  BITE_DELAY_MAX_MS: 30_000,
  RESPONSE_WINDOW_MS: 60_000,
  EXPIRED_RECALL_MS: 30_000,
  PULL_COOLDOWN_MS: 5_000,
};

export const FISHING_MESSAGES = {
  CAST_ACCEPTED: (username: string) => `🎣 @${username} забросил удочку…`,
  ALREADY_FISHING: (username: string) => `@${username}, ты уже рыбачишь`,
  BITE: (username: string) => `@${username}, клюёт! Пиши !тянуть 🎣`,
  PULL_EARLY: (username: string) => `@${username}, пока тихо — жди поклёвку`,
  PULL_NO_CAST: (username: string) =>
    `@${username}, сначала закинь удочку — !рыбалка`,
  PULL_TOO_LATE: (username: string) => `@${username}, поздно — сорвалась`,
  EXPIRED: (username: string) => `@${username}, не успел — рыба сорвалась…`,
  CATCH_XP: (username: string, xp: number) =>
    `⚡ @${username} выловил — +${xp} XP`,
  CATCH_BANK: (username: string, bank: number) =>
    `🎣 @${username} вытянул сундук — +${bank} в банк!`,
  CAST_COOLDOWN: (username: string, remainingSeconds: number) =>
    `⏳ @${username}, удочка ещё в воде — через ${remainingSeconds}s`,
  PULL_COOLDOWN: (username: string, remainingSeconds: number) =>
    `⏳ @${username}, удочка сушится — ещё ${remainingSeconds}s`,
  EMPTY_VARIANTS: [
    (username: string) => `@${username} вытянул пустую банку…`,
    (username: string) => `@${username} поймал старый ботинок…`,
    (username: string) => `@${username} вытащил пучок водорослей…`,
  ],
  COINS_VARIANTS: [
    (username: string, coins: number) => `@${username} выловил — +${coins} монет`,
    (username: string, coins: number) => `@${username} натягал рыбы — +${coins} монет`,
    (username: string, coins: number) => `@${username} распутал сеть — +${coins} монет`,
  ],
} as const;
