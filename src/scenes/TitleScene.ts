import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE } from '../config';
import { addMuteToggle } from '../ui';

const FONT = 'Courier New, monospace';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload(): void {
    this.load.image('menu-background', `${import.meta.env.BASE_URL}assets/main_menu_bg.png`);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.add.image(0, 0, 'menu-background')
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.add.text(84, 96, 'POCKET PALACE  /  1987', {
      color: '#8e8495', fontFamily: FONT, fontSize: '14px', letterSpacing: 1,
    });
    this.add.text(78, 128, 'LAST', {
      color: '#f2b84b', fontFamily: FONT, fontSize: '34px', fontStyle: 'bold',
    });
    this.add.text(74, 157, 'LIFT', {
      color: '#f5e8c8', fontFamily: FONT, fontSize: '76px', fontStyle: 'bold',
    });

    this.add.text(84, 267, GOAL_LINE, {
      color: '#f5e8c8',
      fontFamily: FONT,
      fontSize: '18px',
      lineSpacing: 7,
      wordWrap: { width: 440 },
    });

    const buttonX = 84;
    const buttonY = 382;
    const button = this.add.rectangle(buttonX, buttonY, 250, 52, PALETTE.ink)
      .setOrigin(0)
      .setStrokeStyle(2, PALETTE.lamp)
      .setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(buttonX + 18, buttonY + 17, 'START  ›', {
      color: '#f2b84b', fontFamily: FONT, fontSize: '17px', fontStyle: 'bold',
    });
    button.on('pointerover', () => {
      button.setFillStyle(PALETTE.lamp);
      buttonText.setColor('#17131f');
    });
    button.on('pointerout', () => {
      button.setFillStyle(PALETTE.ink);
      buttonText.setColor('#f2b84b');
    });
    button.on('pointerup', () => this.scene.start('RoomScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('RoomScene'));

    this.add.text(84, 472, 'CONTAINS A JUMPSCARE', {
      color: '#c64a4a', fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', letterSpacing: 1,
    });

    addMuteToggle(this, GAME_WIDTH - 34, 28);
  }
}
