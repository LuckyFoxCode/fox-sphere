export function useSound() {
  const playSound = (path: string, volume: number = 0.5) => {
    if (typeof window === 'undefined') return;

    const audio = new Audio(path);
    audio.volume = volume;

    audio.play().catch((error) => console.error(`Error to play sound: ${path}`, error));
  };

  return {
    playSound,
  };
}
