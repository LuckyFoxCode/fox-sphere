import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, type Socket } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();
