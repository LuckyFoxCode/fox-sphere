import type { ProfileShowPayload } from '@fox-sphere/types';

export const WATCH_STREAK_MILESTONES = [3, 5, 7, 10, 15, 20, 30, 45, 60, 80, 100] as const;

const ACHIEVEMENTS_BASE_PATH = '/assets/achievements/watch-streak';

/**
 * The highest milestone at or below `streakValue`, or `null` when none was reached yet.
 *
 * Milestones are the only badges that exist on disk, so a streak awarded between two of them
 * shows the lower one - 35 renders the 30 badge. That is deliberate: `WATCH_STREAK_MILESTONES`
 * and the files in `public/assets/achievements/watch-streak/` are one fixed list.
 */
export const getWatchStreakMilestone = (streakValue: number): number | null => {
  if (!Number.isFinite(streakValue)) return null;

  let achieved: (typeof WATCH_STREAK_MILESTONES)[number] | null = null;

  for (const milestone of WATCH_STREAK_MILESTONES) {
    if (streakValue < milestone) break;
    achieved = milestone;
  }

  return achieved;
};

const watchStreakAchievementPath = (milestone: number): string =>
  `${ACHIEVEMENTS_BASE_PATH}/streak-${milestone}.webp`;

export const getWatchStreakAchievement = (streakValue: number): string | null => {
  const milestone = getWatchStreakMilestone(streakValue);

  return milestone === null ? null : watchStreakAchievementPath(milestone);
};

/** One earned badge, ready to render in a profile-card slot. */
export interface ProfileAchievement {
  key: string;
  src: string;
  label: string;
}

/**
 * A slot is a position in the profile card's achievement row, not a list entry: the card asks
 * slot 0 for its badge, slot 1 for its own, and so on.
 *
 * Returning `null` means "this viewer has not earned it" and leaves the slot as a placeholder -
 * so a new achievement type is one more resolver here plus its assets, never a change to
 * `ProfileCard.vue`.
 */
export type ProfileAchievementResolver = (profile: ProfileShowPayload) => ProfileAchievement | null;

export const PROFILE_ACHIEVEMENT_SLOTS: readonly ProfileAchievementResolver[] = [
  (profile) => {
    const milestone = getWatchStreakMilestone(profile.bestStreak ?? 0);

    if (milestone === null) return null;

    return {
      key: 'watch-streak',
      src: watchStreakAchievementPath(milestone),
      label: `watch streak ${milestone}`,
    };
  },
];

/** The row always renders this many cells, earned or not. */
export const PROFILE_ACHIEVEMENT_SLOT_COUNT = 4;
