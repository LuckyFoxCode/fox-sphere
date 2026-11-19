import type { MusicNowPlaying } from '@fox-sphere/types';
import { ref } from 'vue';
import { type PlaybackAnchor, anchorFrom, positionAt } from '@/utils/music';
import type { WidgetSocket } from './types';

/**
 * Последнее известное состояние «что играет». Живёт вне компонента, как у остальных
 * сокет-композаблов overlay: виджет один, а подписка не должна зависеть от того,
 * смонтирован ли он прямо сейчас.
 */
const state = ref<MusicNowPlaying | null>(null);
const positionMs = ref(0);
const durationMs = ref(0);
const isPlaying = ref(false);

// Агент шлёт сердцебиение раз в 15 секунд, значит три пропуска - это молчание.
// Сервер о смерти агента не знает (состояние в памяти без таймеров), поэтому
// протухание ловится здесь.
const SILENCE_LIMIT_MS = 45_000;

let anchor: PlaybackAnchor | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let rafId: number | null = null;
let isSocketInitialized = false;

const stopLoop = () => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
};

// Позиция считается от якоря по часам, а не накручивается счётчиком: тогда
// скрытая вкладка OBS, вернувшись, показывает правильное место, а не отставшее.
const tick = () => {
  if (!anchor) {
    rafId = null;
    return;
  }

  positionMs.value = positionAt(anchor, Date.now(), durationMs.value);
  rafId = requestAnimationFrame(tick);
};

const startLoop = () => {
  stopLoop();
  rafId = requestAnimationFrame(tick);
};

const clear = () => {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }

  stopLoop();
  anchor = null;
  state.value = null;
  positionMs.value = 0;
  durationMs.value = 0;
  isPlaying.value = false;
};

const apply = (next: MusicNowPlaying | null) => {
  if (!next) {
    clear();
    return;
  }

  // Догон после перезагрузки сцены приносит то, что сервер держит в памяти, а
  // таймеров у него нет: агент мог умереть полчаса назад, и пакет приедет с
  // `sentAt` тех времён. Показать его как живой трек - хуже, чем не показать
  // ничего: на экране появляется застывшая полоска и «пауза», которой нет.
  if (Date.now() - next.sentAt > SILENCE_LIMIT_MS) {
    clear();
    return;
  }

  state.value = next;
  durationMs.value = next.durationMs;
  isPlaying.value = next.isPlaying;
  anchor = anchorFrom(next, Date.now());
  positionMs.value = positionAt(anchor, Date.now(), next.durationMs);

  // На паузе позиция стоит, и тратить кадры не на что: цикл проснётся на
  // следующем событии, где `apply` снова его запустит. Без этого overlay
  // крутит rAF всю ночь на паузе, рядом с Phaser-сценой.
  if (next.isPlaying) startLoop();
  else stopLoop();

  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(clear, SILENCE_LIMIT_MS);
};

export function useMusicSocket(socketInstance: WidgetSocket) {
  if (!isSocketInitialized) {
    socketInstance.on('music:now-playing', apply);

    // Догон после перезагрузки сцены: живое событие уже улетело, а состояние нужно
    // сразу. Позицию вернёт `sentAt` внутри payload, поэтому ответ может быть старым.
    const fetchCurrent = () => {
      socketInstance.emit('music:get-current', {}, (response) => apply(response));
    };

    // Слушатель ставится всегда, а не только когда сокет ещё не подключён: сервер
    // состояние на переподключение не переотправляет, и без этого виджет после
    // обрыва связи ждал бы следующего сердцебиения (до 15 с) с пустым экраном.
    socketInstance.on('connect', fetchCurrent);
    if (socketInstance.connected) fetchCurrent();

    isSocketInitialized = true;
  }

  return { state, positionMs, durationMs, isPlaying };
}
