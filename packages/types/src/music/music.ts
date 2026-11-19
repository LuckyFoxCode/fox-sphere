// Состояние «что играет» в браузере стримера. Позиция уже интерполирована
// агентом на Windows: сырое значение Windows GSMTC не двигается во время
// воспроизведения (`UpdatePosition` приходит только на старте и при перемотке).
export type MusicNowPlaying = {
  title: string;
  artist: string;
  album: string | null;
  // data URL (image/png или image/jpeg), либо null, если обложки нет
  artwork: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  // Момент отправки по часам машины с OBS, epoch ms. Нужен, чтобы состояние,
  // полученное через ack после перезагрузки сцены, ставило полоску на место,
  // а не откатывало её на пятнадцать секунд назад.
  sentAt: number;
};

export type MusicGetCurrentPayload = Record<string, never>;

export interface MusicServerToClientEvents {
  "music:now-playing": (state: MusicNowPlaying | null) => void;
}

export interface MusicClientToServerEvents {
  "music:get-current": (
    _data: MusicGetCurrentPayload,
    callback: (state: MusicNowPlaying | null) => void,
  ) => void;
}
