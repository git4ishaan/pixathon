import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE } from '../config';

export class RoomScene extends Phaser.Scene {
  constructor() {
    super('RoomScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.add.text(GAME_WIDTH / 2, 44, GOAL_LINE, {
      color: '#f5e8c8',
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      align: 'center',
      wordWrap: { width: GAME_WIDTH * 0.9 },
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Room scaffold ready', {
      color: '#8e8495',
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 52, 'Room, clues, keypad, and timer are next.', {
      color: '#f2b84b',
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
    }).setOrigin(0.5);
  }
}
