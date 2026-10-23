import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE, reducedMotion } from '../config';
import { addMuteToggle } from '../ui';

const FONT = 'Courier New, monospace';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.drawLobby();
    this.drawSurveillanceOverlay();

    this.add.text(72, 54, 'POCKET PALACE  /  SUNNYDAY PLAZA', {
      color: '#8e8495', fontFamily: FONT, fontSize: '14px', letterSpacing: 2,
    });
    this.add.text(72, 75, 'NIGHT CLEANING SHIFT  •  1987', {
      color: '#8e8495', fontFamily: FONT, fontSize: '12px', letterSpacing: 1,
    });

    this.add.text(70, 142, 'LAST', {
      color: '#f5e8c8', fontFamily: FONT, fontSize: '31px', fontStyle: 'bold',
    });
    this.add.text(66, 169, 'LIFT', {
      color: '#f2b84b', fontFamily: FONT, fontSize: '78px', fontStyle: 'bold',
    });
    this.add.rectangle(76, 270, 270, 2, PALETTE.lamp).setOrigin(0, 0.5).setAlpha(0.7);

    this.add.text(76, 292, GOAL_LINE, {
      color: '#f5e8c8',
      fontFamily: FONT,
      fontSize: '18px',
      lineSpacing: 8,
      wordWrap: { width: 390 },
    });

    const start = this.add.container(76, 404);
    const button = this.add.rectangle(0, 0, 286, 54, PALETTE.lamp).setOrigin(0);
    const buttonText = this.add.text(18, 16, 'BEGIN NIGHT SHIFT  ›', {
      color: '#17131f', fontFamily: FONT, fontSize: '17px', fontStyle: 'bold',
    });
    start.add([button, buttonText]);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(PALETTE.paper));
    button.on('pointerout', () => button.setFillStyle(PALETTE.lamp));
    button.on('pointerup', () => this.scene.start('RoomScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('RoomScene'));

    this.add.text(76, 480, 'CONTAINS A JUMPSCARE', {
      color: '#c64a4a', fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', letterSpacing: 1,
    });
    this.add.text(76, 501, 'DEMO ONLY  ·  NEVER ENTER A REAL PASSWORD', {
      color: '#8e8495', fontFamily: FONT, fontSize: '10px', letterSpacing: 1,
    });

    addMuteToggle(this, GAME_WIDTH - 38, 30);
    if (!reducedMotion()) {
      const statusLight = this.add.circle(780, 136, 4, PALETTE.danger).setAlpha(0.45);
      this.tweens.add({ targets: statusLight, alpha: 0.9, duration: 1800, yoyo: true, repeat: -1 });
    }
  }

  private drawLobby(): void {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    const room = this.add.graphics();
    room.fillStyle(PALETTE.muted, 0.14);
    room.fillRect(42, 34, 876, 412);
    room.fillStyle(PALETTE.ink, 0.62);
    room.fillRect(42, 34, 876, 22);
    room.fillRect(42, 424, 876, 22);

    room.lineStyle(2, PALETTE.paper, 0.16);
    room.strokeRect(42, 34, 876, 412);
    room.lineStyle(1, PALETTE.muted, 0.3);
    for (let x = 68; x < 918; x += 76) room.lineBetween(x, 58, x, 414);

    // The elevator is a closed, watched threshold; Chime stays still in the gap.
    room.fillStyle(PALETTE.ink, 1);
    room.fillRect(650, 92, 206, 324);
    room.fillStyle(PALETTE.muted, 0.52);
    room.fillRect(642, 84, 222, 12);
    room.fillRect(642, 84, 8, 340);
    room.fillRect(856, 84, 8, 340);
    room.fillStyle(PALETTE.paper, 0.12);
    room.fillRect(660, 104, 91, 300);
    room.fillRect(755, 104, 91, 300);
    room.fillStyle(PALETTE.ink, 0.9);
    room.fillRect(748, 104, 9, 300);
    room.fillStyle(PALETTE.lamp, 0.55);
    room.fillRect(739, 151, 3, 34);
    room.fillStyle(PALETTE.paper, 0.62);
    room.fillRect(735, 66, 38, 15);

    room.fillStyle(PALETTE.muted, 0.7);
    room.fillRect(773, 267, 22, 58);
    room.fillRect(767, 254, 34, 24);
    room.fillRect(770, 228, 9, 32);
    room.fillRect(789, 228, 9, 32);
    room.fillStyle(PALETTE.danger, 0.72);
    room.fillRect(775, 261, 4, 3);
    room.fillRect(789, 261, 4, 3);

    room.fillStyle(PALETTE.lamp, 0.14);
    room.fillRect(70, 101, 412, 3);
    room.fillRect(70, 101, 3, 272);
    room.fillStyle(PALETTE.muted, 0.1);
    room.fillRect(42, 446, 876, 68);
    room.lineStyle(1, PALETTE.paper, 0.12);
    room.lineBetween(42, 446, 918, 446);
    room.fillStyle(PALETTE.lamp, 0.16);
    room.fillRect(624, 446, 268, 4);

    this.add.text(680, 112, 'LIFT 01', {
      color: '#8e8495', fontFamily: FONT, fontSize: '10px', letterSpacing: 1,
    });
    this.add.text(682, 374, 'OUT OF SERVICE', {
      color: '#8e8495', fontFamily: FONT, fontSize: '9px', letterSpacing: 1,
    });
  }

  private drawSurveillanceOverlay(): void {
    const overlay = this.add.graphics();
    overlay.lineStyle(1, PALETTE.paper, 0.12);
    overlay.strokeRect(18, 18, GAME_WIDTH - 36, GAME_HEIGHT - 36);
    overlay.lineStyle(2, PALETTE.paper, 0.4);
    const corners = [
      [18, 18, 26, 18], [18, 18, 18, 26],
      [GAME_WIDTH - 18, 18, GAME_WIDTH - 26, 18], [GAME_WIDTH - 18, 18, GAME_WIDTH - 18, 26],
      [18, GAME_HEIGHT - 18, 26, GAME_HEIGHT - 18], [18, GAME_HEIGHT - 18, 18, GAME_HEIGHT - 26],
      [GAME_WIDTH - 18, GAME_HEIGHT - 18, GAME_WIDTH - 26, GAME_HEIGHT - 18],
      [GAME_WIDTH - 18, GAME_HEIGHT - 18, GAME_WIDTH - 18, GAME_HEIGHT - 26],
    ];
    for (const [x1, y1, x2, y2] of corners) overlay.lineBetween(x1, y1, x2, y2);

    overlay.lineStyle(1, PALETTE.paper, 0.035);
    for (let y = 22; y < GAME_HEIGHT - 18; y += 5) overlay.lineBetween(20, y, GAME_WIDTH - 20, y);

    this.add.text(GAME_WIDTH - 194, GAME_HEIGHT - 43, 'CAM 01  /  LOBBY', {
      color: '#8e8495', fontFamily: FONT, fontSize: '10px', letterSpacing: 1,
    });
    this.add.text(34, GAME_HEIGHT - 43, 'SIGNAL WEAK', {
      color: '#8e8495', fontFamily: FONT, fontSize: '10px', letterSpacing: 1,
    });
  }
}
