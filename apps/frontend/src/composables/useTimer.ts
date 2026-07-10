import { computed, ref } from 'vue';

export function useTimer() {
  const timeLeft = ref(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const startTimer = (durationInMinutes: number) => {
    stopTimer();
    timeLeft.value = durationInMinutes * 60;

    timerInterval = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--;
      } else {
        stopTimer();
      }
    }, 1000);
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
