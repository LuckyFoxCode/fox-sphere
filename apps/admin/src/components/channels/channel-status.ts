import type { ChannelStatus } from '@/api/generated/schemas';

export type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const statusVariant: Record<ChannelStatus, StatusVariant> = {
  PENDING: 'secondary',
  ACTIVE: 'default',
  PAUSED: 'outline',
  REVOKED: 'destructive',
};
