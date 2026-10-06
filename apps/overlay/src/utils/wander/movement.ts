export interface MovementTarget {
  newX: number;
  newDirection: 1 | -1;
  moveDuration: number;
  actualDistance: number;
}

const MIN_X = 5;
const MAX_X = 95;
export const SPEED_FACTOR = 0.45;

/** Delay before the very first decision, matching the DOM walker's start delay. */
export const WANDER_INITIAL_DELAY = { min: 1000, max: 3000 } as const;

/** Pause after deciding to stand still. */
export const WANDER_IDLE_PAUSE = { min: 3500, max: 8000 } as const;

/** Pause after arriving somewhere. */
export const WANDER_STEP_PAUSE = { min: 400, max: 1200 } as const;

/** Where a single walker spawns, as a percentage of the canvas width. */
export const WANDER_START_X = { min: 10, max: 80 } as const;

/**
 * Ground speed, in viewport-width percent per second, at which the walk cycle plays at the
 * frame rate the animation was authored at.
 *
 * `calculateNextStep` derives a step's duration from its distance, so every step travels at
 * the same nominal speed of `1 / SPEED_FACTOR`, divided by the hero's own speed. The only
 * steps that deviate are the tiny ones clamped by the 1.5s duration floor near a bound -
 * those move slower than nominal, and the time scale below is what keeps their feet from
 * sliding.
 */
export const REFERENCE_SPEED = 1 / SPEED_FACTOR;

/** Safety bounds. `MAX_ANIM_TIME_SCALE` is unreachable for any step `calculateNextStep` produces. */
export const MIN_ANIM_TIME_SCALE = 0.5;
export const MAX_ANIM_TIME_SCALE = 2;

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateNextStep(
  currentX: number,
  currentDirection: 1 | -1,
  speed = 1,
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

  const moveDuration = Math.max(
    1.5,
    Number(((actualDistance * SPEED_FACTOR) / speed).toFixed(1)),
  );

  return { newX, newDirection: direction, moveDuration, actualDistance };
}

/**
 * One wander decision, or `null` to stand still.
 *
 * `calculateNextStep` never actually returns `null` (it always turns inward at a bound, and
 * a step is at least 8 units long), so a `null` here always means "the coin flip said wait".
 *
 * Deliberately free of any Phaser import: importing the engine pulls in a canvas 2d context
 * at module load, which jsdom cannot provide.
 */
export const nextWanderStep = (
  currentX: number,
  currentDirection: 1 | -1,
  speed = 1,
  random: () => number = Math.random,
): MovementTarget | null =>
  random() <= 0.5 ? null : calculateNextStep(currentX, currentDirection, speed);

/**
 * Matches the walk cycle to the ground speed the step actually travels at: twice the nominal
 * speed plays the cycle twice as fast, so the stride length stays put on the ground.
 *
 * An `anims.timeScale` is used rather than a tween `timeScale`, because the latter would also
 * stretch the step itself out of its `moveDuration`.
 */
export const calculateAnimTimeScale = (step: MovementTarget): number => {
  const groundSpeed = step.actualDistance / step.moveDuration;

  return Math.min(
    Math.max(groundSpeed / REFERENCE_SPEED, MIN_ANIM_TIME_SCALE),
    MAX_ANIM_TIME_SCALE,
  );
};
