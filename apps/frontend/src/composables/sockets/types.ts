import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';

export type WidgetSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type LotteryStatus = 'idle' | 'ticket' | 'started' | 'drawer' | 'finished' | 'participants';
export type TwitchEventType = 'idle' | 'reward' | 'raid' | 'follow' | 'add-vip' | 'timer';
export type UserEventType = 'idle' | 'level-up';
