// Данные событий (Payloads)
//
// Прототип `!profile`. `displayName` и `color` не хранятся в базе для этой цели — их даёт
// сообщение в чате, поэтому их добавляет команда, а не `UserService`.
export interface ProfileShowPayload {
  username: string;
  displayName: string;
  color: string;
  userId: string;
  lvl: number;
  xp: number;
  coins: number;
  heroId: string | null;
  heroLevel: number | null;
  // «Лучшая» серия просмотров, а не текущая: `WatchStreak` — журнал выданных наград,
  // текущей серии в схеме нет.
  bestStreak: number | null;
  isMod: boolean;
  isFounder: boolean;
  isSubscriber: boolean;
  isPermanentVip: boolean;
  isLuckyVip: boolean;
}

// Контракты событий Socket.io
export interface ProfileServerToClientEvents {
  "profile:show": (data: ProfileShowPayload) => void;
}

export interface ProfileClientToServerEvents {}
