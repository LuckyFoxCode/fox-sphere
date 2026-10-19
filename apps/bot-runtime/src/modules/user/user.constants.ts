export const COOLDOWNS = {
  CACHE_CLEAR_INTERVAL: 24 * 60 * 60 * 1000,
  XP_MESSAGE_COOLDOWN: 15 * 1000,
  XP_LOTTERY_COOLDOWN: 5 * 1000,
  COINS_CACHE_TTL: 10000,
  /**
   * Kept deliberately short: `CACHE_CLEAR_INTERVAL` is 24 hours, so a longer TTL means a hero
   * changed in the database stays invisible for the rest of the day.
   */
  HERO_CACHE_TTL: 30 * 1000,
};

export const XP_REWARDS = {
  DEFAULT: 1,
  SUBSCRIBER: 3,
  BROADCASTER: 3,
  FOLLOWER: 2,
  LOTTERY: 1,
  VIP_BONUS: 1,
  /**
   * The manual `!addfounder` status, and the same +1 as the permanent VIP bonus on purpose:
   * both are permanent flags a human grants, so a founder keeps this on every message. It
   * stacks with `VIP_BONUS` rather than replacing it - the two are granted for different
   * reasons, and a founder who is also a VIP is a subscriber's 3 + 1 + 1 = 5.
   */
  FOUNDER_BONUS: 1,
};

export const isWatchStreakRewardLevel = (streak: number): boolean => {
  if (streak === 3 || streak === 5 || streak === 7) return true;
  return streak >= 10 && streak % 5 === 0;
};
