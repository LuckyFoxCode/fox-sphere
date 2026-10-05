import {
  WANDER_IDLE_PAUSE,
  WANDER_INITIAL_DELAY,
  WANDER_STEP_PAUSE,
  calculateAnimTimeScale,
  getRandomInt,
  nextWanderStep,
} from '@/utils/wander';
import Phaser from 'phaser';

export const HERO_Y_OFFSET = 22;

export interface WanderOptions {
  xPercent: number;
  idleKey: string;
  walkKey: string;
}

const toPixels = (width: number, xPercent: number) => (width * xPercent) / 100;

/**
 * Moves one sprite around the bottom lane in steps, driven by tweens instead of a velocity.
 *
 * The horizontal position is kept as a percentage of the canvas width and converted to pixels
 * only when a step starts.
 */
export class WanderController {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly options: WanderOptions;
  private xPercent: number;
  private direction: 1 | -1;
  private timer: Phaser.Time.TimerEvent | null = null;
  private tween: Phaser.Tweens.Tween | null = null;
  private stopped = false;

  constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, options: WanderOptions) {
    this.scene = scene;
    this.sprite = sprite;
    this.options = options;
    this.xPercent = options.xPercent;
    this.direction = Math.random() > 0.5 ? 1 : -1;
  }

  start(): void {
    this.stopped = false;
    this.placeAtStart();
    this.sprite.setFlipX(this.direction === 1);
    this.playIdle();
    this.schedule(getRandomInt(WANDER_INITIAL_DELAY.min, WANDER_INITIAL_DELAY.max));
  }

  /**
   * Re-anchors the sprite to the current canvas size after a resize.
   *
   * `xPercent` is set to a step's target when the tween *starts*, so mid-walk it already
   * points where the hero was heading. Re-anchoring to that would teleport it up to a
   * quarter of the lane forward, so the live sprite position is adopted first.
   */
  public reposition(): void {
    this.timer?.remove();
    this.tween?.remove();
    this.timer = null;
    this.tween = null;

    const width = this.scene.scale.width;

    if (width > 0) {
      this.xPercent = (this.sprite.x / width) * 100;
    }

    this.start();
  }

  stop(): void {
    this.stopped = true;
    this.timer?.remove();
    this.tween?.remove();
    this.timer = null;
    this.tween = null;
  }

  private placeAtStart(): void {
    this.sprite.setPosition(
      toPixels(this.scene.scale.width, this.xPercent),
      this.scene.scale.height + HERO_Y_OFFSET,
    );
  }

  private schedule(delay: number): void {
    this.timer = this.scene.time.delayedCall(delay, () => this.decide());
  }

  private decide(): void {
    this.timer = null;
    if (this.stopped) return;

    const step = nextWanderStep(this.xPercent, this.direction);

    if (!step) {
      this.playIdle();
      this.schedule(getRandomInt(WANDER_IDLE_PAUSE.min, WANDER_IDLE_PAUSE.max));
      return;
    }

    this.xPercent = step.newX;
    this.direction = step.newDirection;
    this.sprite.setFlipX(step.newDirection === 1);

    this.tween = this.scene.tweens.add({
      targets: this.sprite,
      x: toPixels(this.scene.scale.width, step.newX),
      duration: step.moveDuration * 1000,
      ease: 'Linear',
      onComplete: () => {
        this.tween = null;
        if (this.stopped) return;

        this.playIdle();
        this.schedule(getRandomInt(WANDER_STEP_PAUSE.min, WANDER_STEP_PAUSE.max));
      },
    });

    this.sprite.anims.timeScale = calculateAnimTimeScale(step);
    this.sprite.play(this.options.walkKey, true);
  }

  private playIdle(): void {
    this.sprite.anims.timeScale = 1;
    this.sprite.play(this.options.idleKey, true);
  }
}
