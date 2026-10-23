import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE } from '../config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 'LAST LIFT', {
      color: '#f2b84b',
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.43, GOAL_LINE, {
      color: '#f5e8c8',
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      align: 'center',
      wordWrap: { width: GAME_WIDTH * 0.78 },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, 'Contains a jumpscare.', {
      color: '#c64a4a',
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
    }).setOrigin(0.5);

    const play = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.76, '[ PLAY ]', {
      color: '#17131f',
      backgroundColor: '#f2b84b',
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    play.on('pointerup', () => this.scene.start('RoomScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('RoomScene'));
  }
}
