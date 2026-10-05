import { getRandomInt } from '@/components/pokemon/utils';
import Phaser from 'phaser';
import { WANDER_START_X } from './walk-decision';
import { HERO_Y_OFFSET, WanderController } from './wander';

const HERO_SCALE = 0.25;

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private wander: WanderController | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    this.load.spritesheet('hero_idle', 'assets/sprites/assassin-idle.png', {
      frameWidth: 480,
      frameHeight: 480,
    });
    this.load.spritesheet('hero_walk', 'assets/sprites/assassin-walking.png', {
      frameWidth: 480,
      frameHeight: 480,
    });
  }

  create(): void {
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('hero_idle', {
        start: 0,
        end: 15,
      }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('hero_walk', {
        start: 0,
        end: 19,
      }),
      frameRate: 16,
      repeat: -1,
    });

    // Origin at the feet so the sprite stands on the bottom edge of the canvas, and the
    // walker owns the vertical placement - no physics, no fall on spawn.
    this.player = this.add
      .sprite(0, this.scale.height + HERO_Y_OFFSET, 'hero_idle')
      .setOrigin(0.5, 1);
    this.player.setScale(HERO_SCALE);

    this.wander = new WanderController(
      this,
      this.player,
      getRandomInt(WANDER_START_X.min, WANDER_START_X.max),
    );
    this.wander.start();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleShutdown(): void {
    this.wander?.stop();
    this.wander = null;
  }
}
