import type { MusicNowPlaying } from "@fox-sphere/types";

// Последнее состояние «что играет» живёт только в памяти процесса: это
// эфемерное состояние, а не история, и писать его в БД незачем. После
// перезапуска бота виджет гаснет и ждёт следующего сердцебиения (<= 15 c).
let current: MusicNowPlaying | null = null;

/**
 * Обложка приезжает только при смене трека: агент читает её из GSMTC потоком и
 * шлёт в теле до ~270 КБ base64, а сердцебиение раз в 15 секунд с ней же
 * означало бы десятки мегабайт за вечер. Поэтому сердцебиение того же трека
 * приходит с `artwork: null`, и здесь к нему возвращается прежняя картинка -
 * иначе она пропадала бы с экрана каждые 15 секунд, а ack после перезагрузки
 * сцены отдавал бы состояние без обложки.
 */
export const mergeNowPlaying = (
  previous: MusicNowPlaying | null,
  next: MusicNowPlaying | null,
): MusicNowPlaying | null => {
  if (!next) return null;
  if (next.artwork !== null) return next;

  const sameTrack =
    previous !== null &&
    previous.title === next.title &&
    previous.artist === next.artist;

  if (!sameTrack || previous.artwork === null) return next;

  return { ...next, artwork: previous.artwork };
};

/** Принимает состояние от агента и возвращает то, что теперь лежит в памяти. */
export const setNowPlaying = (
  state: MusicNowPlaying | null,
): MusicNowPlaying | null => {
  current = mergeNowPlaying(current, state);

  return current;
};

export const getNowPlaying = (): MusicNowPlaying | null => current;
