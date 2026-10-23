import Phaser from 'phaser';
import { chimeBell, scareSting, winJingle, wrongBuzz } from '../audio/sfx';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE, reducedMotion } from '../config';
import { advanceChime, initChime, isClueLocked, TIMER_STEPS_MS } from '../game/chime';
import { createPuzzle, freshSeed, submitCode } from '../game/rules';
import { CLUE_IDS } from '../game/types';
import type { ChimeState, ClueId, ClueInstance, PatrolPoint, Puzzle } from '../game/types';
import { Keypad } from '../keypad';
import { addMuteToggle } from '../ui';

const HEADER_HEIGHT = 64;
const RAIL_X = 680;
const ROOM_W = RAIL_X;
const STRIP_Y = 456;
const TIME_LIMIT_MS = 3 * 60 * 1000;
const WRONG_CODE_PENALTY_MS = 10 * 1000;
const JUMPSCARE_MS = 900;
const FONT = 'Courier New, monospace';

const AREA_LABEL: Readonly<Record<PatrolPoint, string>> = {
  office: 'STORE OFFICE',
  corridor: 'SERVICE CORRIDOR',
  'lift-lobby': 'LIFT LOBBY',
};
const PATROL: readonly PatrolPoint[] = ['office', 'corridor', 'lift-lobby'];

// The ?seed= link applies to the first run only; restarts get a fresh seed.
let urlSeedUsed = false;

declare global {
  interface Window {
    /** Dev server only: brute-forces a passing code for the active puzzle. Never present in production builds. */
    liftDevSolve?: () => string | null;
  }
}

interface SceneData {
  seed?: string;
}

interface HotspotView {
  clue: ClueInstance;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
}

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export class RoomScene extends Phaser.Scene {
  private seed = '';
  private puzzle!: Puzzle;
  private chimeState!: ChimeState;
  private nextTimerStep = 0;
  private remainingMs = TIME_LIMIT_MS;
  /** Real play time. Separate from remainingMs so the wrong-code penalty cannot trigger timer steps. */
  private elapsedMs = 0;
  private running = false;
  private found = new Set<ClueId>();
  private hotspots = new Map<ClueId, HotspotView>();
  private pulse?: Phaser.Tweens.Tween;
  private popup?: Phaser.GameObjects.Container;
  private logPanel?: Phaser.GameObjects.Container;
  private keypad?: Keypad;
  private timerText!: Phaser.GameObjects.Text;
  private chimeText!: Phaser.GameObjects.Text;
  private chimePips: Phaser.GameObjects.Rectangle[] = [];
  private banner!: Phaser.GameObjects.Text;
  private evidenceTitle!: Phaser.GameObjects.Text;
  private chips: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('RoomScene');
  }

  init(data: SceneData): void {
    const fromUrl = urlSeedUsed ? null : new URLSearchParams(window.location.search).get('seed');
    urlSeedUsed = true;
    this.seed = data.seed ?? fromUrl ?? freshSeed();
  }

  create(): void {
    this.puzzle = createPuzzle(this.seed);
    this.chimeState = initChime();
    this.nextTimerStep = 0;
    this.remainingMs = TIME_LIMIT_MS;
    this.elapsedMs = 0;
    this.running = true;
    this.found = new Set();
    this.hotspots = new Map();
    this.popup = undefined;
    this.logPanel = undefined;
    this.chimePips = [];
    this.chips = [];

    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.drawLayout();
    this.drawHotspots();
    this.drawEvidenceStrip();
    this.mountKeypad();
    addMuteToggle(this, GAME_WIDTH - 8, 6);
    this.refreshChime();
    if (import.meta.env.DEV) window.liftDevSolve = () => this.devSolve();

    const onEsc = (): void => {
      if (this.logPanel) this.closeLog();
      else this.closePopup();
    };
    const onLog = (): void => this.toggleLog();
    this.input.keyboard?.on('keydown-ESC', onEsc);
    this.input.keyboard?.on('keydown-L', onLog);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', onEsc);
      this.input.keyboard?.off('keydown-L', onLog);
      this.keypad?.destroy();
      this.keypad = undefined;
      if (import.meta.env.DEV) delete window.liftDevSolve;
    });
  }

  update(_time: number, delta: number): void {
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.remainingMs - delta);
    this.elapsedMs += delta;
    this.timerText.setText(this.formatTime(this.remainingMs));
    if (this.remainingMs <= 30_000) this.timerText.setColor(css(PALETTE.danger));

    const elapsed = this.elapsedMs;
    while (this.running && this.nextTimerStep < TIMER_STEPS_MS.length && elapsed >= TIMER_STEPS_MS[this.nextTimerStep]) {
      this.nextTimerStep += 1;
      this.moveChime('timer');
    }
    if (this.running && this.remainingMs === 0) this.finish('timeout');
  }

  // ------------------------------------------------------------------ layout

  private drawLayout(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, HEADER_HEIGHT, PALETTE.ink).setOrigin(0).setDepth(1);
    this.add.rectangle(0, HEADER_HEIGHT - 1, GAME_WIDTH, 2, PALETTE.muted).setOrigin(0).setDepth(1);
    this.add.text(12, HEADER_HEIGHT / 2, GOAL_LINE, {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '13px',
      wordWrap: { width: 470 },
    }).setOrigin(0, 0.5).setDepth(2);

    this.chimeText = this.add.text(500, 14, '', {
      color: css(PALETTE.danger),
      fontFamily: FONT,
      fontSize: '12px',
    }).setDepth(2);
    PATROL.forEach((_, i) => {
      this.chimePips.push(this.add.rectangle(500 + i * 56, 40, 50, 8, PALETTE.muted).setOrigin(0).setDepth(2));
    });
    this.timerText = this.add.text(828, HEADER_HEIGHT / 2 + 8, this.formatTime(this.remainingMs), {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(2);

    // Room view and control rail backdrops (Soham's background art replaces the room view).
    this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, 0x211b2e).setOrigin(0);
    this.add.rectangle(RAIL_X, HEADER_HEIGHT, GAME_WIDTH - RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, PALETTE.ink)
      .setOrigin(0)
      .setStrokeStyle(2, PALETTE.muted);
    this.banner = this.add.text(ROOM_W / 2, HEADER_HEIGHT + 16, '', {
      color: css(PALETTE.danger),
      backgroundColor: css(PALETTE.ink),
      fontFamily: FONT,
      fontSize: '14px',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(5).setAlpha(0);
  }

  private mountKeypad(): void {
    const keypad = new Keypad(this, RAIL_X, HEADER_HEIGHT);
    keypad.onSubmit((code: string): void => this.onSubmit(code));
    this.keypad = keypad;
  }

  // ---------------------------------------------------------------- hotspots

  private drawHotspots(): void {
    for (const clue of this.puzzle.clues) {
      const box = this.add.rectangle(clue.x, clue.y, clue.width, clue.height, 0x2d2540)
        .setStrokeStyle(2, PALETTE.muted)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(clue.x, clue.y, clue.label.toUpperCase(), {
        color: css(PALETTE.paper),
        fontFamily: FONT,
        fontSize: '12px',
        align: 'center',
        wordWrap: { width: clue.width - 12 },
      }).setOrigin(0.5);
      const tag = this.add.text(clue.x, clue.y + clue.height / 2 - 14, '', {
        color: css(PALETTE.danger),
        fontFamily: FONT,
        fontSize: '11px',
      }).setOrigin(0.5);
      box.on('pointerover', () => {
        if (!this.isLocked(clue.id)) box.setStrokeStyle(2, PALETTE.lamp);
      });
      box.on('pointerout', () => this.styleBox(clue.id));
      box.on('pointerup', () => this.inspect(clue));
      this.hotspots.set(clue.id, { clue, box, label, tag });
      if (clue.pulse) this.startPulse(box);
    }
  }

  private isLocked(id: ClueId): boolean {
    return isClueLocked(this.chimeState, id);
  }

  private styleBox(id: ClueId): void {
    const view = this.hotspots.get(id);
    if (!view) return;
    const locked = this.isLocked(id);
    const found = this.found.has(id);
    view.box.setFillStyle(found ? 0x4a3a2a : 0x2d2540);
    view.box.setStrokeStyle(2, locked ? PALETTE.danger : found ? PALETTE.lamp : PALETTE.muted);
    view.box.setAlpha(locked ? 0.35 : 1);
    view.label.setAlpha(locked ? 0.35 : 1);
    view.tag.setText(locked ? 'CHIME IS HERE' : '');
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
    this.pulse = undefined;
    for (const id of this.hotspots.keys()) this.styleBox(id);
  }

  private inspect(clue: ClueInstance): void {
    if (!this.running) return;
    if (this.isLocked(clue.id)) {
      this.showBanner(`Chime is in the ${AREA_LABEL[this.chimeState.point].toLowerCase()}. Try another clue.`);
      return;
    }
    this.stopPulse();
    if (!this.found.has(clue.id)) {
      this.found.add(clue.id);
      this.styleBox(clue.id);
      this.refreshEvidence();
    }
    this.showPopup(clue);
  }

  // ---------------------------------------------------------------- evidence

  private drawEvidenceStrip(): void {
    this.add.rectangle(0, STRIP_Y - 6, ROOM_W, GAME_HEIGHT - STRIP_Y + 6, PALETTE.ink).setOrigin(0).setDepth(3);
    this.add.rectangle(0, STRIP_Y - 6, ROOM_W, 2, PALETTE.muted).setOrigin(0).setDepth(3);
    this.evidenceTitle = this.add.text(12, STRIP_Y, '', {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '12px',
    }).setDepth(4);
    this.add.text(ROOM_W - 12, STRIP_Y, 'EVIDENCE LOG  [L]', {
      color: css(PALETTE.ink),
      backgroundColor: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '12px',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setDepth(4).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.toggleLog());
    this.refreshEvidence();
  }

  private refreshEvidence(): void {
    this.evidenceTitle.setText(`EVIDENCE ${this.found.size}/${this.puzzle.clues.length}`);
    this.chips.forEach((c) => c.destroy());
    this.chips = [];
    let x = 12;
    let y = STRIP_Y + 26;
    for (const clue of this.puzzle.clues) {
      if (!this.found.has(clue.id)) continue;
      const missing = clue.needs.filter((n) => !this.found.has(n));
      const chip = this.add.text(x, y, missing.length > 0 ? `${clue.label} (needs ${missing.length})` : clue.label, {
        color: css(missing.length > 0 ? PALETTE.muted : PALETTE.paper),
        backgroundColor: '#2d2540',
        fontFamily: FONT,
        fontSize: '11px',
        padding: { x: 6, y: 3 },
      }).setDepth(4).setInteractive({ useHandCursor: true });
      if (x + chip.width > ROOM_W - 12) {
        x = 12;
        y += 24;
        chip.setPosition(x, y);
      }
      x += chip.width + 8;
      chip.on('pointerup', () => this.showPopup(clue));
      this.chips.push(chip);
    }
  }

  private observationBlock(clue: ClueInstance): string {
    const needs = clue.needs.map((id) => {
      const name = this.puzzle.clues.find((c) => c.id === id)?.label ?? id;
      return `${name}${this.found.has(id) ? '' : ' (not found yet)'}`;
    });
    return needs.length > 0 ? `${clue.observation}\n\nNeeds: ${needs.join(', ')}` : clue.observation;
  }

  private toggleLog(): void {
    if (this.logPanel) this.closeLog();
    else this.showLog();
  }

  private showLog(): void {
    this.closePopup();
    const lines = this.puzzle.clues
      .filter((c) => this.found.has(c.id))
      .map((c) => `${c.label.toUpperCase()}\n${this.observationBlock(c)}`);
    const text = lines.length > 0 ? lines.join('\n\n') : 'Nothing yet. Click the glowing object to start.';
    const shade = this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(ROOM_W / 2, HEADER_HEIGHT + 215, 620, 400, PALETTE.ink).setStrokeStyle(3, PALETTE.lamp);
    const title = this.add.text(ROOM_W / 2, HEADER_HEIGHT + 30, 'EVIDENCE LOG', {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '16px',
    }).setOrigin(0.5);
    const body = this.add.text(ROOM_W / 2 - 290, HEADER_HEIGHT + 56, text, {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '11px',
      lineSpacing: 2,
      wordWrap: { width: 580 },
    });
    const hint = this.add.text(ROOM_W / 2, HEADER_HEIGHT + 400, 'Click or press Esc to close', {
      color: css(PALETTE.muted),
      fontFamily: FONT,
      fontSize: '11px',
    }).setOrigin(0.5);
    shade.on('pointerup', () => this.closeLog());
    this.logPanel = this.add.container(0, 0, [shade, panel, title, body, hint]).setDepth(10);
  }

  private closeLog(): void {
    this.logPanel?.destroy();
    this.logPanel = undefined;
  }

  // ------------------------------------------------------------------- popup

  private showPopup(clue: ClueInstance): void {
    this.closePopup();
    this.closeLog();
    const width = 480;
    const cx = ROOM_W / 2;
    const cy = HEADER_HEIGHT + 215;
    const shade = this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, 0x000000, 0.5)
      .setOrigin(0)
      .setInteractive();
    const title = this.add.text(cx, cy - 70, clue.label.toUpperCase(), {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '16px',
    }).setOrigin(0.5);
    const body = this.add.text(cx, cy - 40, this.observationBlock(clue), {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '14px',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5, 0);
    const panel = this.add.rectangle(cx, cy, width, Math.max(160, body.height + 110), PALETTE.ink)
      .setStrokeStyle(3, PALETTE.lamp);
    panel.setPosition(cx, cy - 40 + body.height / 2);
    title.setY(panel.y - panel.height / 2 + 24);
    body.setY(title.y + 22);
    const hint = this.add.text(cx, panel.y + panel.height / 2 - 16, 'Click or press Esc to close', {
      color: css(PALETTE.muted),
      fontFamily: FONT,
      fontSize: '11px',
    }).setOrigin(0.5);
    shade.on('pointerup', () => this.closePopup());
    this.popup = this.add.container(0, 0, [shade, panel, title, body, hint]).setDepth(10);
  }

  private closePopup(): void {
    this.popup?.destroy();
    this.popup = undefined;
  }

  // ------------------------------------------------------------------- chime

  private moveChime(reason: 'timer' | 'wrong-code'): void {
    this.chimeState = advanceChime(this.chimeState, reason);
    this.refreshChime();
    if (this.chimeState.caught) {
      this.finish('caught');
      return;
    }
    chimeBell(this);
    const moved = `Chime moves to the ${AREA_LABEL[this.chimeState.point].toLowerCase()}.`;
    this.showBanner(reason === 'wrong-code' ? `Wrong code. -10 seconds. ${moved}` : moved);
  }

  private refreshChime(): void {
    const { point, caught } = this.chimeState;
    this.chimeText.setText(caught ? 'CHIME HAS YOU' : `CHIME: ${AREA_LABEL[point]}`);
    this.chimePips.forEach((pip, i) => {
      const idx = PATROL.indexOf(point);
      pip.setFillStyle(i === idx ? PALETTE.danger : i < idx ? 0x6b3434 : PALETTE.muted);
    });
    for (const id of this.hotspots.keys()) this.styleBox(id);
    // A popup for a clue that just got locked stays readable; only new clicks are blocked.
  }

  private showBanner(message: string): void {
    this.banner.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 2200, duration: 600 });
  }

  // ------------------------------------------------------------- submissions

  private onSubmit(code: string): void {
    if (!this.running) return;
    const result = submitCode(this.puzzle, code, this.found);
    this.keypad?.setResult(result);
    if (result.pass) {
      this.finish('win');
      return;
    }
    this.remainingMs = Math.max(0, this.remainingMs - WRONG_CODE_PENALTY_MS);
    this.timerText.setText(this.formatTime(this.remainingMs));
    wrongBuzz(this);
    this.moveChime('wrong-code');
  }

  // ----------------------------------------------------------------- endings

  private finish(outcome: 'win' | 'caught' | 'timeout'): void {
    if (!this.running) return;
    this.running = false;
    this.keypad?.setLocked(true);
    this.closePopup();
    this.closeLog();
    this.pulse?.stop();
    const data = { outcome: outcome === 'win' ? 'win' : 'lose', seed: this.seed };
    if (outcome === 'win') {
      winJingle(this);
      this.time.delayedCall(400, () => this.scene.start('EndScene', data));
      return;
    }
    this.playJumpscare(() => this.scene.start('EndScene', data));
  }

  /** At most one second, a single red flash (never faster than 3 per second), calm when reduced motion is on. */
  private playJumpscare(done: () => void): void {
    scareSting(this);
    const calm = reducedMotion();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const flash = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a0a0a).setOrigin(0).setDepth(100);
    const face = this.add.container(cx, cy).setDepth(101);
    face.add([
      this.add.circle(0, 0, 110, 0xb08d3c).setStrokeStyle(6, 0x17131f),
      this.add.rectangle(-42, -20, 34, 34, 0xc64a4a),
      this.add.rectangle(42, -20, 34, 34, 0xc64a4a),
      this.add.rectangle(0, 52, 120, 14, 0x17131f),
    ]);
    if (calm) {
      face.setScale(1);
    } else {
      face.setScale(0.5);
      this.tweens.add({ targets: face, scale: 1.6, duration: 450, ease: 'Cubic.easeIn' });
      this.tweens.add({ targets: flash, fillColor: 0x5a1010, duration: 300 });
      this.cameras.main.shake(350, 0.01);
    }
    this.time.delayedCall(JUMPSCARE_MS, done);
  }

  /** Dev only: tries every six-digit code through submitCode and returns the one that passes. */
  private devSolve(): string | null {
    const all = new Set<ClueId>(CLUE_IDS);
    for (let n = 0; n < 1_000_000; n++) {
      const attempt = n.toString().padStart(6, '0');
      if (submitCode(this.puzzle, attempt, all).pass) return attempt;
    }
    return null;
  }

  private formatTime(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
