import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

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

    this.physics.world.setBounds(0, 0, window.innerWidth, window.innerHeight + 15);

    this.player = this.physics.add.sprite(700, 1250, 'hero_idle');
    this.player.setScale(0.25);
    this.player.setCollideWorldBounds(true);

    this.player.body.setSize(200, 300);
    this.player.body.setOffset(140, 150);

    this.startWandering();
  }

  private startWandering(): void {
    const makeDecision = () => {
      // Расширяем кубик: 0 = стоять, 1 = идти, 2 = бежать
      const action = Phaser.Math.Between(0, 1);

      if (action === 0) {
        // --- СОСТОЯНИЕ: СТОИМ НА МЕСТЕ ---
        this.player.setVelocityX(0);
        this.player.play('idle', true);
      } else {
        // Выбираем направление: -1 (влево) или 1 (вправо)
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        this.player.setFlipX(direction === 1);

        if (action === 1) {
          // --- СОСТОЯНИЕ: ХОДЬБА ---
          const walkSpeed = Phaser.Math.Between(40, 80);
          this.player.setVelocityX(walkSpeed * direction);
          this.player.play('walk', true);
        }
      }

      // Выбираем задержку до следующего решения (от 2 до 5 секунд)
      const nextDelay = Phaser.Math.Between(2000, 5000);

      // Запускаем таймер на следующий шаг
      this.time.delayedCall(nextDelay, makeDecision);
    };

    // Запускаем первый шаг
    makeDecision();
  }
}
