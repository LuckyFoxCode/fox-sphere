export const WATCH_STREAK_MILESTONES = [3, 5, 7, 10, 15, 20, 30, 45, 60, 80, 100] as const;

const ACHIEVEMENTS_BASE_PATH = '/assets/achievements/watch-streak';

export const getWatchStreakAchievement = (streakValue: number): string | null => {
  if (!Number.isFinite(streakValue)) return null;

  let achieved: (typeof WATCH_STREAK_MILESTONES)[number] | null = null;

  for (const milestone of WATCH_STREAK_MILESTONES) {
    if (streakValue < milestone) break;
    achieved = milestone;
  }

  if (achieved === null) return null;

  return `${ACHIEVEMENTS_BASE_PATH}/streak-${achieved}.webp`;
};
