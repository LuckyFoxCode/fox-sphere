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
  // Пожизненный счётчик золотого пива; ступень из него считает оверлей.
  goldenBeers: number;
  isMod: boolean;
  isFounder: boolean;
  isSubscriber: boolean;
  isPermanentVip: boolean;
  isLuckyVip: boolean;
  // Не колонка в базе, а тег сообщения: от него зависит спецтитул `GAME MASTER`.
  isBroadcaster: boolean;
}

// Контракты событий Socket.io
export interface ProfileServerToClientEvents {
  "profile:show": (data: ProfileShowPayload) => void;
}

export interface ProfileClientToServerEvents {}
