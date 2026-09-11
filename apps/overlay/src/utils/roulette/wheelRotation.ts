export const segmentCenterAngle = (index: number, segmentCount: number): number =>
  (index + 0.5) * (360 / segmentCount);

export const pickSegmentIndex = (
  segments: readonly { readonly id: string }[],
  id: string,
  random: () => number = Math.random,
): number | null => {
  const matches: number[] = [];
  segments.forEach((segment, index) => {
    if (segment.id === id) matches.push(index);
  });

  const first = matches[0];
  if (first === undefined) return null;

  return matches[Math.floor(random() * matches.length)] ?? first;
};

// Указатель сверху колеса = 0° в системе колеса. Сверху подпись выигрышного
// сектора читается сверху вниз прямыми глифами: иконка у обода, цифры под ней.
const POINTER_ANGLE = 0;

export const computeWheelRotation = (
  currentRotation: number,
  targetIndex: number,
  segmentCount: number,
  fullTurns: number,
  random: () => number = Math.random,
): number => {
  const segmentAngle = 360 / segmentCount;
  const center = segmentCenterAngle(targetIndex, segmentCount);

  // Джиттер не выходит за пределы сектора — стрелка всегда внутри выигрышного.
  const inset = segmentAngle * 0.25;
  const jitter = (random() * 2 - 1) * inset;

  const current = ((currentRotation % 360) + 360) % 360;
  const delta = (((POINTER_ANGLE - center - jitter - current) % 360) + 360) % 360;

  return currentRotation + fullTurns * 360 + delta;
};
