import type { ProfileShowPayload } from '@fox-sphere/types';
import { getGoldenBeerTier } from '@fox-sphere/types';

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

const PIVO_ACHIEVEMENTS_BASE_PATH = '/assets/achievements/pivo';

/** Порядок совпадает с `PIVO_TIER_THRESHOLDS` из `@fox-sphere/types`. */
export const PIVO_TIER_LABELS = ['fresh', 'dark', 'aged', 'golden', 'legendary'] as const;

export const getGoldenBeerTierLabel = (tier: number): string =>
  PIVO_TIER_LABELS[tier - 1] ?? PIVO_TIER_LABELS[0];

export const pivoTierAchievementPath = (tier: number): string =>
  `${PIVO_ACHIEVEMENTS_BASE_PATH}/tier-${tier}.webp`;

/** One earned badge, ready to render in a profile-card slot. */
export interface ProfileAchievement {
  key: string;
  src: string;
  label: string;
}

/**
 * A slot is a position in the profile card's achievement row, not a list entry: the card asks
 * every resolver for its badge, keeps the ones that are earned in this order, and fills the
 * remaining cells with placeholders.
 *
 * Returning `null` means "this viewer has not earned it". Earned badges are packed to the left,
 * so a `null` never leaves a hole in front of another badge - it only shortens the row.
 * A new achievement type is one more resolver here plus its assets, never a change to
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
  (profile) => {
    const tier = getGoldenBeerTier(profile.goldenBeers);

    if (tier === 0) return null;

    return {
      key: 'golden-beer',
      src: pivoTierAchievementPath(tier),
      label: `golden beer x${profile.goldenBeers}`,
    };
  },
];

/** The row always renders this many cells, earned or not. */
export const PROFILE_ACHIEVEMENT_SLOT_COUNT = 4;

/**
 * The badges a viewer earned, packed into a row of `slotCount` cells.
 *
 * Earned badges come first, in `PROFILE_ACHIEVEMENT_SLOTS` order, and the rest of the row is
 * `null` placeholders. That is what keeps a missing badge from leaving a hole *in front of* one
 * the viewer does have: a viewer with no watch streak shows their beer badge in cell 0 rather
 * than in cell 1 behind a dashed cell. Position therefore identifies no particular badge, and
 * the placeholders are always the trailing cells.
 */
export const resolveProfileAchievementSlots = (
  profile: ProfileShowPayload,
  slotCount: number = PROFILE_ACHIEVEMENT_SLOT_COUNT,
): (ProfileAchievement | null)[] => {
  const earned = PROFILE_ACHIEVEMENT_SLOTS.map((resolve) => resolve(profile)).filter(
    (achievement): achievement is ProfileAchievement => achievement !== null,
  );

  return Array.from({ length: slotCount }, (_, index) => earned[index] ?? null);
};
