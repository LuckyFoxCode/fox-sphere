// frameUrl: '@/assets/images/frames/frame_1.png'

export interface RankTier {
  gradient: string;
  // frameUrl?: string; // TODO: add path to rank frame image when ready
}

export interface RankConfig {
  minLvl: number;
  maxLvl: number;
  rankTitle: string;
  gradient: string;
}

export const RANK_TIERS = {
  1: { gradient: 'linear-gradient(to right, #4B5563, #FEF08A, #4B5563)' },
  2: { gradient: 'linear-gradient(to right, #FCD34D, #B45309, #FCD34D)' },
  3: { gradient: 'linear-gradient(to right, #475569, #D1D5DB, #E2E8F0)' },
  4: { gradient: 'linear-gradient(to right, #FCD34D,  #FEF08A)' },
  5: { gradient: 'linear-gradient(to right, #38BDF8, #10B981, #38BDF8)' },
  6: { gradient: 'linear-gradient(to right, #C084FC,#9333EA, #C084FC)' },
  7: { gradient: 'linear-gradient(to right, #E11D48, #F472B6, #E11D48)' },
  8: { gradient: 'linear-gradient(to right, #059669, #34D399, #059669)' },
  9: { gradient: 'linear-gradient(to right, #0284C7, #38BDF8, #0284C7)' },
  10: { gradient: 'linear-gradient(to right, #E11D48, #38BDF8, #DC2626)' },
} as const satisfies Record<number, RankTier>;

const RAW_TITLE_CONFIG = [
  { minLvl: 1, maxLvl: 5, rankTitle: 'NEWBIE', tier: 1 },
  { minLvl: 6, maxLvl: 10, rankTitle: 'ROOKIE', tier: 1 },
  { minLvl: 11, maxLvl: 20, rankTitle: 'SCOUT', tier: 2 },
  { minLvl: 21, maxLvl: 30, rankTitle: 'WARRIOR', tier: 3 },
  { minLvl: 31, maxLvl: 40, rankTitle: 'ELITE', tier: 3 },
  { minLvl: 41, maxLvl: 50, rankTitle: 'EXPERT', tier: 4 },
  { minLvl: 51, maxLvl: 60, rankTitle: 'MASTER', tier: 4 },
  { minLvl: 61, maxLvl: 70, rankTitle: 'GRANDMASTER', tier: 5 },
  { minLvl: 71, maxLvl: 80, rankTitle: 'HERO', tier: 6 },
  { minLvl: 81, maxLvl: 88, rankTitle: 'EPIC', tier: 7 },
  { minLvl: 89, maxLvl: 94, rankTitle: 'LEGEND', tier: 8 },
  { minLvl: 95, maxLvl: 97, rankTitle: 'MYTHIC', tier: 8 },
  { minLvl: 98, maxLvl: 99, rankTitle: 'SUPREME', tier: 9 },
  { minLvl: 100, maxLvl: Infinity, rankTitle: 'OVERLORD', tier: 10 },
] as const;

export const TITLE_CONFIG: readonly RankConfig[] = RAW_TITLE_CONFIG.map((item) => ({
  minLvl: item.minLvl,
  maxLvl: item.maxLvl,
  rankTitle: item.rankTitle,
  gradient: RANK_TIERS[item.tier].gradient,
}));

export const BROADCASTER_RANK: Omit<RankConfig, 'minLvl' | 'maxLvl'> = {
  rankTitle: 'GAME MASTER',
  gradient: 'linear-gradient(to right, #DC2626, #FEF08A, #DC2626)',
};

export const getRankConfigByLevel = (level?: number, isBroadcaster?: boolean) => {
  if (isBroadcaster) {
    return BROADCASTER_RANK;
  }

  const currentLevel = level ?? 1;
  const match = TITLE_CONFIG.find(
    (item) => currentLevel >= item.minLvl && currentLevel <= item.maxLvl,
  );

  return match ?? TITLE_CONFIG[0];
};
