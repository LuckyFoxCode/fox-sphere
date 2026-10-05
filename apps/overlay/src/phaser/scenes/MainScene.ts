import { HEROES } from '@fox-sphere/types';
import { getRandomInt, WANDER_START_X } from '@/utils/wander';
import Phaser from 'phaser';
import { setHeroLaneHost } from '../hero-lane';
import { HeroAgent, heroIdleKey, heroWalkKey } from './hero-agent';

export class MainScene extends Phaser.Scene {
  private readonly agents = new Map<string, HeroAgent>();

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    for (const hero of HEROES) {
      const frameSize = { frameWidth: hero.frameWidth, frameHeight: hero.frameHeight };

      this.load.spritesheet(heroIdleKey(hero.id), hero.idle.path, frameSize);
      this.load.spritesheet(heroWalkKey(hero.id), hero.walk.path, frameSize);
    }
  }

  create(): void {
    for (const hero of HEROES) {
      this.anims.create({
        key: heroIdleKey(hero.id),
        frames: this.anims.generateFrameNumbers(heroIdleKey(hero.id), {
          start: 0,
          end: hero.idle.frames - 1,
        }),
        frameRate: hero.idle.frameRate,
        repeat: -1,
      });

      this.anims.create({
        key: heroWalkKey(hero.id),
        frames: this.anims.generateFrameNumbers(heroWalkKey(hero.id), {
          start: 0,
          end: hero.walk.frames - 1,
        }),
        frameRate: hero.walk.frameRate,
        repeat: -1,
      });
    }

    setHeroLaneHost({
      addHero: (userId, heroId) => this.addHero(userId, heroId),
      attachLabel: (userId, label) => this.agents.get(userId)?.setLabel(label),
      removeHero: (userId) => this.removeHero(userId),
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.handleTeardown, this);
    this.events.on(Phaser.Scenes.Events.DESTROY, this.handleTeardown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private addHero(userId: string, heroId: string): void {
    this.removeHero(userId);

    const startX = getRandomInt(WANDER_START_X.min, WANDER_START_X.max);

    this.agents.set(userId, new HeroAgent(this, heroId, startX));
  }

  private removeHero(userId: string): void {
    const agent = this.agents.get(userId);

    if (!agent) return;

    agent.destroy();
    this.agents.delete(userId);
  }

  private handleUpdate(): void {
    for (const agent of this.agents.values()) {
      agent.syncLabel();
    }
  }

  private handleResize(): void {
    for (const agent of this.agents.values()) {
      agent.reposition();
    }
  }

  /**
   * Releases the bridge and every agent. Runs on both SHUTDOWN and DESTROY because
   * `Game.destroy()` only emits DESTROY — and it nulls `scene.add` straight after, so a
   * bridge still bound to a destroyed scene would throw on its next spawn. Idempotent:
   * either event alone is enough, and both can fire.
   */
  private handleTeardown(): void {
    setHeroLaneHost(null);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    for (const userId of this.agents.keys()) {
      this.removeHero(userId);
    }
  }
}
