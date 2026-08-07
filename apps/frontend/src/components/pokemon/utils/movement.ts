export interface MovementTarget {
  newX: number;
  newDirection: 1 | -1;
  moveDuration: number;
  actualDistance: number;
}

const MIN_X = 5;
const MAX_X = 95;
const SPEED_FACTOR = 0.45;

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateNextStep(
  currentX: number,
  currentDirection: 1 | -1,
): MovementTarget | null {
  let direction = currentDirection;

  if (currentX >= MAX_X) {
    direction = -1;
  } else if (currentX <= MIN_X) {
    direction = 1;
  }

  const stepDistance = getRandomInt(8, 25);
  const potentialX = currentX + stepDistance * direction;

  const newX = Math.min(Math.max(potentialX, MIN_X), MAX_X);
  const actualDistance = Math.abs(newX - currentX);

  if (actualDistance === 0) return null;

  const moveDuration = Math.max(1.5, Number((actualDistance * SPEED_FACTOR).toFixed(1)));

  return {
    newX,
    newDirection: direction,
    moveDuration,
    actualDistance,
  };
}
