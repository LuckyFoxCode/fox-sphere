import type { TwitchAnnouncementColor } from '@fox-sphere/types';

export const ANNOUNCE_COLORS: Record<
  TwitchAnnouncementColor,
  { borderColor: string; tint: string }
> = {
  blue: { borderColor: '#1E90FF', tint: 'rgba(30, 144, 255, 0.12)' },
  green: { borderColor: '#32CD32', tint: 'rgba(50, 205, 50, 0.12)' },
  orange: { borderColor: '#FFA500', tint: 'rgba(255, 165, 0, 0.12)' },
  purple: { borderColor: '#A855F7', tint: 'rgba(168, 85, 247, 0.12)' },
};

export function getAnnounceStyle(color?: TwitchAnnouncementColor) {
  return color ? ANNOUNCE_COLORS[color] : null;
}
