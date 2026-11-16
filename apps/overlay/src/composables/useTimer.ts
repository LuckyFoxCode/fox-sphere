import { computed, ref } from 'vue';

export function useTimer() {
  const timeLeft = ref(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Остаток считается от абсолютного `endsAt`, а не вычитанием единицы из
   * счётчика. Разница видна ровно в двух случаях, и оба реальные: браузер в OBS
   * троттлит таймеры (свёрнутое окно, сон машины) — тогда вычитание отстаёт от
   * часов на всё время простоя, — и таймер, поднятый посреди стрика, обязан
   * показать настоящее время, а не то, сколько тиков успело пройти.
   */
  const tick = (endsAt: number) => {
    const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    timeLeft.value = secondsLeft;

    if (secondsLeft === 0) {
      stopTimer();
    }
  };

  const startTimer = (endsAt: number) => {
    stopTimer();
    tick(endsAt);

    if (timeLeft.value > 0) {
      timerInterval = setInterval(() => tick(endsAt), 1000);
    }
  };

  const stopTimer = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    timeLeft.value = 0;
  };

  const timeDigits = computed(() => {
    const totalSeconds = timeLeft.value;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    let timeString = '';

    if (totalSeconds >= 3600) {
      timeString = `${pad(hours)}:${pad(minutes)}`;
    } else {
      timeString = `${pad(minutes)}:${pad(seconds)}`;
    }

    return timeString.split('');
  });

  return {
    timeLeft,
    timeDigits,
    startTimer,
    resetTimer,
    stopTimer,
  };
}
