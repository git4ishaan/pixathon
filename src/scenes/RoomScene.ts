import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE, reducedMotion } from '../config';
import { addMuteToggle } from '../ui';

const HEADER_HEIGHT = 64;
const RAIL_X = 680;
const HOTSPOT_W = 120;
const HOTSPOT_H = 132;
const TIME_LIMIT_MS = 3 * 60 * 1000;
const FONT = 'Courier New, monospace';

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  clueText: string;
}

// Stub data with the ROOM_BLOCKOUT.md positions. Swap for src/data/clues.ts once it exists.
const HOTSPOTS: readonly Hotspot[] = [
  { id: 'party-table', label: 'PARTY TABLE', x: 130, y: 365, clueText: 'Placeholder clue.' },
  { id: 'statues', label: 'STATUES', x: 455, y: 350, clueText: 'Placeholder clue.' },
  { id: 'poster', label: 'POSTER', x: 100, y: 160, clueText: 'Placeholder clue.' },
  { id: 'calendar', label: 'CALENDAR', x: 250, y: 160, clueText: 'Placeholder clue.' },
  { id: 'radio', label: 'RADIO', x: 400, y: 160, clueText: 'Placeholder clue.' },
  { id: 'ticket', label: 'TICKET STUB', x: 290, y: 380, clueText: 'Placeholder clue.' },
  { id: 'plaque', label: 'PLAQUE', x: 550, y: 160, clueText: 'Placeholder clue.' },
  { id: 'lift-panel', label: 'LIFT PANEL', x: 612, y: 315, clueText: 'Placeholder clue.' },
];

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export class RoomScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private remainingMs = TIME_LIMIT_MS;
  private running = false;
  private found = new Set<string>();
  private boxes = new Map<string, Phaser.GameObjects.Rectangle>();
  private pulse?: Phaser.Tweens.Tween;
  private popup?: Phaser.GameObjects.Container;

  constructor() {
    super('RoomScene');
  }

  create(): void {
    this.remainingMs = TIME_LIMIT_MS;
    this.running = true;
    this.found = new Set();
    this.boxes = new Map();
    this.popup = undefined;

    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.drawLayout();
    this.drawHotspots();
    addMuteToggle(this, GAME_WIDTH - 8, 6);

    this.input.keyboard?.on('keydown-ESC', this.closePopup, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.closePopup, this);
    });
  }

  update(_time: number, delta: number): void {
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.remainingMs - delta);
    this.timerText.setText(this.formatTime(this.remainingMs));
    if (this.remainingMs <= 30_000) this.timerText.setColor(css(PALETTE.danger));
    if (this.remainingMs === 0) this.onTimeUp();
  }

  private drawLayout(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, HEADER_HEIGHT, PALETTE.ink).setOrigin(0).setDepth(1);
    this.add.rectangle(0, HEADER_HEIGHT - 1, GAME_WIDTH, 2, PALETTE.muted).setOrigin(0).setDepth(1);
    this.add.text(12, HEADER_HEIGHT / 2, GOAL_LINE, {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '14px',
      wordWrap: { width: 600 },
    }).setOrigin(0, 0.5).setDepth(2);
    this.timerText = this.add.text(820, HEADER_HEIGHT / 2 + 8, this.formatTime(this.remainingMs), {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(2);

    // Room view and control rail backdrops (art replaces the room view later).
    this.add.rectangle(0, HEADER_HEIGHT, RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, 0x211b2e).setOrigin(0);
    this.add.rectangle(RAIL_X, HEADER_HEIGHT, GAME_WIDTH - RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, PALETTE.ink)
      .setOrigin(0)
      .setStrokeStyle(2, PALETTE.muted);
  }

  private drawHotspots(): void {
    HOTSPOTS.forEach((spot, index) => {
      const box = this.add.rectangle(spot.x, spot.y, HOTSPOT_W, HOTSPOT_H, 0x2d2540)
        .setStrokeStyle(2, PALETTE.muted)
        .setInteractive({ useHandCursor: true });
      this.add.text(spot.x, spot.y, spot.label, {
        color: css(PALETTE.paper),
        fontFamily: FONT,
        fontSize: '12px',
        align: 'center',
        wordWrap: { width: HOTSPOT_W - 12 },
      }).setOrigin(0.5);
      box.on('pointerover', () => box.setStrokeStyle(2, PALETTE.lamp));
      box.on('pointerout', () => box.setStrokeStyle(2, this.found.has(spot.id) ? PALETTE.lamp : PALETTE.muted));
      box.on('pointerup', () => this.inspect(spot));
      this.boxes.set(spot.id, box);
      if (index === 0) this.startPulse(box);
    });
  }

  private startPulse(box: Phaser.GameObjects.Rectangle): void {
    if (reducedMotion()) {
      box.setStrokeStyle(4, PALETTE.lamp);
      return;
    }
    this.pulse = this.tweens.add({
      targets: box,
      alpha: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopPulse(): void {
    if (!this.pulse) return;
    this.pulse.stop();
    this.boxes.get(HOTSPOTS[0].id)?.setAlpha(1).setStrokeStyle(2, PALETTE.muted);
    this.pulse = undefined;
  }

  private inspect(spot: Hotspot): void {
    if (!this.running) return;
    this.stopPulse();
    this.found.add(spot.id);
    this.boxes.get(spot.id)?.setFillStyle(0x4a3a2a).setStrokeStyle(2, PALETTE.lamp);
    this.events.emit('clue-found', spot.id);
    this.showPopup(spot);
  }

  private showPopup(spot: Hotspot): void {
    this.closePopup();
    const width = 440;
    const height = 150;
    const cx = RAIL_X / 2;
    const cy = HEADER_HEIGHT + (GAME_HEIGHT - HEADER_HEIGHT) / 2;
    const catcher = this.add.rectangle(0, HEADER_HEIGHT, RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, 0x000000, 0.5)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(cx, cy, width, height, PALETTE.ink).setStrokeStyle(3, PALETTE.lamp);
    const title = this.add.text(cx, cy - 46, spot.label, {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '16px',
    }).setOrigin(0.5);
    const body = this.add.text(cx, cy - 6, spot.clueText, {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '16px',
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5);
    const hint = this.add.text(cx, cy + 52, 'Click or press Esc to close', {
      color: css(PALETTE.muted),
      fontFamily: FONT,
      fontSize: '12px',
    }).setOrigin(0.5);
    catcher.on('pointerup', () => this.closePopup());
    this.popup = this.add.container(0, 0, [catcher, panel, title, body, hint]).setDepth(10);
  }

  private closePopup(): void {
    this.popup?.destroy();
    this.popup = undefined;
  }

  private onTimeUp(): void {
    this.running = false;
    this.closePopup();
    this.events.emit('time-up');
    // Placeholder until the lose flow (jumpscare + EndScene) is built.
    const cx = RAIL_X / 2;
    const cy = HEADER_HEIGHT + (GAME_HEIGHT - HEADER_HEIGHT) / 2;
    this.add.rectangle(0, HEADER_HEIGHT, RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, 0x000000, 0.7).setOrigin(0).setDepth(20);
    this.add.text(cx, cy - 20, 'CHIME GOT YOU', {
      color: css(PALETTE.danger),
      fontFamily: FONT,
      fontSize: '32px',
    }).setOrigin(0.5).setDepth(21);
    this.add.text(cx, cy + 30, 'TRY AGAIN', {
      color: css(PALETTE.ink),
      backgroundColor: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '20px',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.restart());
  }

  private formatTime(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
