import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { GAME_HEIGHT, GAME_WIDTH, GOAL_LINE, PALETTE, reducedMotion } from '../config';
import { advanceChime, initChime, isClueLocked, TIMER_STEPS_MS } from '../game/chime';
import { CODE_LENGTH, createPuzzle, freshSeed, submitCode } from '../game/rules';
import { CLUE_IDS } from '../game/types';
import type { ChimeState, ClueId, ClueInstance, PatrolPoint, Puzzle } from '../game/types';
import { completedIds, hasProgress, initStations, isComplete, revealFragments, revealedText, splitFragments } from '../game/stations';
import type { StationsState } from '../game/stations';
import { Keypad } from '../keypad';
import { addMuteToggle } from '../ui';
import { roomBackdrop } from './backdrop';
import { Closeup } from './closeup';
import { Atmosphere, ChimeSprite, openLiftDoors } from './roomFx';

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
  /** The 120x132 click area. Doubles as the visible box when no prop art is loaded. */
  box: Phaser.GameObjects.Rectangle;
  prop?: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  /** Fallback caption, only when there is no prop art. */
  label?: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  tick: Phaser.GameObjects.Graphics;
  mark: Phaser.GameObjects.Text;
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
  private stations!: StationsState;
  private closeup?: Closeup;
  private logPanel?: Phaser.GameObjects.Container;
  private keypad?: Keypad;
  private chimeSprite?: ChimeSprite;
  private atmosphere?: Atmosphere;
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
    this.stations = initStations(this.puzzle);
    this.closeup = undefined;
    this.logPanel = undefined;
    this.chimePips = [];
    this.chips = [];

    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.drawLayout();
    this.drawHotspots();
    this.chimeSprite = new ChimeSprite(this, this.chimeState.point);
    this.atmosphere = new Atmosphere(this);
    this.drawEvidenceStrip();
    this.mountKeypad();
    addMuteToggle(this, GAME_WIDTH - 8, 6);
    this.startAmbient();
    this.refreshChime();
    if (import.meta.env.DEV) window.liftDevSolve = () => this.devSolve();

    const onEsc = (): void => {
      if (this.logPanel) this.closeLog();
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
    this.closeup?.tick();
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
    if (this.textures.exists('room-bg')) {
      this.add.image(0, HEADER_HEIGHT, 'room-bg').setOrigin(0).setScale(4).setDepth(0);
    } else {
      // No room art yet: reuse the menu art, dimmed, instead of a flat blue fill.
      const art = roomBackdrop(this, 0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT);
      if (art) {
        art.setDepth(0);
        this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, PALETTE.ink, 0.3).setOrigin(0).setDepth(0);
      } else {
        this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, 0x211b2e).setOrigin(0);
      }
    }
    this.add.rectangle(RAIL_X, HEADER_HEIGHT, GAME_WIDTH - RAIL_X, GAME_HEIGHT - HEADER_HEIGHT, PALETTE.ink)
      .setOrigin(0)
      .setStrokeStyle(2, PALETTE.muted);
    this.banner = this.add.text(ROOM_W / 2, HEADER_HEIGHT + 16, '', {
      color: css(PALETTE.danger),
      backgroundColor: css(PALETTE.ink),
      fontFamily: FONT,
      fontSize: '14px',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
  }

  private mountKeypad(): void {
    const keypad = new Keypad(this, RAIL_X, HEADER_HEIGHT);
    keypad.onSubmit((code: string): void => this.onSubmit(code));
    keypad.onPress((): void => this.blip(() => sfx.playClick()));
    this.keypad = keypad;
  }

  // ---------------------------------------------------------------- hotspots

  private drawHotspots(): void {
    for (const clue of this.puzzle.clues) {
      const propKey = `prop-${clue.id}`;
      const art = this.textures.exists(propKey);
      const top = clue.y - clue.height / 2;
      const box = this.add.rectangle(clue.x, clue.y, clue.width, clue.height, 0x2d2540, art ? 0 : 1)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      let prop: Phaser.GameObjects.Image | undefined;
      let glow: Phaser.GameObjects.Image | undefined;
      let label: Phaser.GameObjects.Text | undefined;
      if (art) {
        const fit = this.fitScale(propKey, clue);
        prop = this.add.image(clue.x, clue.y, propKey).setScale(fit).setDepth(1);
        if (this.textures.exists(`${propKey}-glow`)) {
          glow = this.add.image(clue.x, clue.y, `${propKey}-glow`).setScale(fit).setDepth(1.5).setAlpha(0);
        }
      } else {
        box.setStrokeStyle(2, PALETTE.muted);
        label = this.add.text(clue.x, clue.y, clue.label.toUpperCase(), {
          color: css(PALETTE.paper),
          fontFamily: FONT,
          fontSize: '12px',
          align: 'center',
          wordWrap: { width: clue.width - 12 },
        }).setOrigin(0.5).setDepth(2);
      }
      const tag = this.add.text(clue.x, clue.y + clue.height / 2 - 14, '', {
        color: css(PALETTE.danger),
        fontFamily: FONT,
        fontSize: '11px',
      }).setOrigin(0.5).setDepth(2);
      const name = this.add.text(clue.x, top - 4, clue.label.toUpperCase(), {
        color: css(PALETTE.paper),
        backgroundColor: css(PALETTE.ink),
        fontFamily: FONT,
        fontSize: '11px',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 1).setDepth(8).setVisible(false);
      const tick = this.add.graphics({ x: clue.x + clue.width / 2 - 12, y: top - 10 }).setDepth(9).setVisible(false);
      tick.lineStyle(3, PALETTE.lamp, 1);
      tick.beginPath();
      tick.moveTo(-6, 0);
      tick.lineTo(-2, 5);
      tick.lineTo(6, -6);
      tick.strokePath();
      const mark = this.add.text(clue.x - clue.width / 2 + 12, top - 10, '?', {
        color: css(PALETTE.lamp),
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(9).setVisible(false);

      box.on('pointerover', () => {
        name.setVisible(true);
        if (this.isLocked(clue.id)) return;
        if (glow) glow.setAlpha(1);
        else box.setStrokeStyle(2, PALETTE.lamp);
      });
      box.on('pointerout', () => {
        name.setVisible(false);
        if (glow && !(clue.pulse && this.pulse)) glow.setAlpha(0);
        this.styleBox(clue.id);
      });
      box.on('pointerup', () => this.inspect(clue));
      const view: HotspotView = { clue, box, prop, glow, label, tag, name, tick, mark };
      this.hotspots.set(clue.id, view);
      if (clue.pulse) this.startPulse(view);
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
    view.tick.setVisible(found);
    view.mark.setVisible(found && view.clue.needs.some((n) => !this.found.has(n)));
    view.tag.setText(locked ? 'CHIME IS HERE' : '');
    if (view.prop) {
      view.prop.setAlpha(locked ? 0.4 : 1);
      if (locked) view.prop.setTint(0xaa6666);
      else view.prop.clearTint();
      view.box.setFillStyle(PALETTE.danger, locked ? 0.14 : 0);
      if (locked) view.box.setStrokeStyle(2, PALETTE.danger);
      else view.box.setStrokeStyle();
      return;
    }
    view.box.setFillStyle(found ? 0x4a3a2a : 0x2d2540);
    view.box.setStrokeStyle(2, locked ? PALETTE.danger : found ? PALETTE.lamp : PALETTE.muted);
    view.box.setAlpha(locked ? 0.35 : 1);
    view.label?.setAlpha(locked ? 0.35 : 1);
  }

  /** The first clue breathes: its glow sprite pulses, or the whole box when there is no glow art. */
  private startPulse(view: HotspotView): void {
    const target = view.glow ?? view.box;
    if (reducedMotion()) {
      if (view.glow) view.glow.setAlpha(0.8);
      else view.box.setStrokeStyle(4, PALETTE.lamp);
      return;
    }
    if (view.glow) view.glow.setAlpha(0.15);
    this.pulse = this.tweens.add({
      targets: target,
      alpha: view.glow ? 1 : 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopPulse(): void {
    if (!this.pulse) return;
    this.pulse.stop();
    this.pulse = undefined;
    for (const view of this.hotspots.values()) {
      view.glow?.setAlpha(0);
      view.box.setAlpha(1);
      this.styleBox(view.clue.id);
    }
  }

  private inspect(clue: ClueInstance): void {
    if (!this.running) return;
    if (this.isLocked(clue.id)) {
      this.showBanner(`Chime is in the ${AREA_LABEL[this.chimeState.point].toLowerCase()}. Try another clue.`);
      return;
    }
    this.stopPulse();
    this.blip(() => sfx.playClueFound());
    if (clue.id === 'radio') this.play('snd-radio', 0.5);
    this.nudge(clue.id);
    this.openCloseup(clue);
  }

  // ----------------------------------------------------------------- closeup

  /** One station: tap its parts to reveal fragments. A clue counts as found once every fragment is revealed. */
  private openCloseup(clue: ClueInstance): void {
    this.closeCloseup();
    this.closeLog();
    this.closeup = new Closeup(
      this,
      {
        clueId: clue.id,
        title: clue.label,
        observation: clue.observation,
        fragments: splitFragments(clue.observation),
        revealed: this.stations.get(clue.id)?.revealed ?? new Set<number>(),
        origin: { x: clue.x, y: clue.y, w: clue.width, h: clue.height },
        needsNote: this.needsNote(clue),
        onReveal: (indices: number[]): void => this.onReveal(clue, indices),
        onClose: (): void => this.closeCloseup(),
      },
      HEADER_HEIGHT,
    );
    this.refreshEvidence();
  }

  private onReveal(clue: ClueInstance, indices: number[]): void {
    this.stations = revealFragments(this.stations, clue.id, indices);
    if (isComplete(this.stations, clue.id) && !this.found.has(clue.id)) {
      this.found.add(clue.id);
      this.blip(() => sfx.playClueFound());
    }
    this.refreshEvidence();
  }

  private closeCloseup(): void {
    this.closeup?.destroy();
    this.closeup = undefined;
  }

  private needsNote(clue: ClueInstance): string {
    if (clue.needs.length === 0) return '';
    const names = clue.needs.map((id) => {
      const name = this.puzzle.clues.find((c) => c.id === id)?.label ?? id;
      return `${name}${this.found.has(id) ? '' : ' (not complete yet)'}`;
    });
    return `Needs: ${names.join(', ')}`;
  }

  /** A short hop on the prop when it is inspected. */
  private nudge(id: ClueId): void {
    const view = this.hotspots.get(id);
    if (!view?.prop || reducedMotion()) return;
    const targets = view.glow ? [view.prop, view.glow] : [view.prop];
    this.tweens.add({ targets, y: view.clue.y - 6, duration: 70, yoyo: true });
  }

  // ---------------------------------------------------------------- evidence

  private drawEvidenceStrip(): void {
    this.add.rectangle(0, STRIP_Y - 6, ROOM_W, GAME_HEIGHT - STRIP_Y + 6, PALETTE.ink).setOrigin(0).setDepth(5);
    this.add.rectangle(0, STRIP_Y - 6, ROOM_W, 2, PALETTE.muted).setOrigin(0).setDepth(5);
    this.evidenceTitle = this.add.text(12, STRIP_Y, '', {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '12px',
    }).setDepth(6);
    this.add.text(ROOM_W - 12, STRIP_Y, 'EVIDENCE LOG  [L]', {
      color: css(PALETTE.ink),
      backgroundColor: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '12px',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setDepth(6).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.toggleLog());
    this.refreshEvidence();
  }

  private refreshEvidence(): void {
    this.evidenceTitle.setText(`EVIDENCE ${completedIds(this.stations).size}/${this.puzzle.clues.length} complete`);
    this.chips.forEach((c) => c.destroy());
    this.chips = [];
    let x = 12;
    let y = STRIP_Y + 26;
    for (const clue of this.puzzle.clues) {
      if (!hasProgress(this.stations, clue.id)) continue;
      const missing = clue.needs.filter((n) => !this.found.has(n));
      const chip = this.add.text(x, y, missing.length > 0 ? `${clue.label} (needs ${missing.length})` : clue.label, {
        color: css(missing.length > 0 ? PALETTE.muted : PALETTE.paper),
        backgroundColor: '#2d2540',
        fontFamily: FONT,
        fontSize: '11px',
        padding: { x: 6, y: 3 },
      }).setDepth(6).setInteractive({ useHandCursor: true });
      if (x + chip.width > ROOM_W - 12) {
        x = 12;
        y += 24;
        chip.setPosition(x, y);
      }
      x += chip.width + 8;
      chip.on('pointerup', () => this.inspect(clue));
      this.chips.push(chip);
    }
    for (const id of this.hotspots.keys()) this.styleBox(id);
  }

  /** Revealed fragments only, plus the needs note once the station is complete. */
  private evidenceBlock(clue: ClueInstance): string {
    const frags = revealedText(this.stations, clue.id, splitFragments(clue.observation));
    const total = splitFragments(clue.observation).length;
    const note = isComplete(this.stations, clue.id) ? this.needsNote(clue) : `(${frags.length}/${total} details found)`;
    return [frags.join(' '), note].filter((t) => t !== '').join('\n');
  }

  private toggleLog(): void {
    if (this.logPanel) this.closeLog();
    else this.showLog();
  }

  private showLog(): void {
    this.closeCloseup();
    const lines = this.puzzle.clues
      .filter((c) => hasProgress(this.stations, c.id))
      .map((c) => `${c.label.toUpperCase()}\n${this.evidenceBlock(c)}`);
    const text = lines.length > 0 ? lines.join('\n\n') : 'Nothing yet. Click the glowing object to start.';
    const shade = this.add.rectangle(0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();
    const art = roomBackdrop(this, 0, HEADER_HEIGHT, ROOM_W, GAME_HEIGHT - HEADER_HEIGHT);
    if (art) shade.setFillStyle(0x000000, 0.15);
    const panel = this.add.rectangle(ROOM_W / 2, HEADER_HEIGHT + 215, 620, 400, PALETTE.ink, art ? 0.55 : 1).setStrokeStyle(3, PALETTE.lamp);
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
    this.logPanel = this.add.container(0, 0, art ? [art, shade, panel, title, body, hint] : [shade, panel, title, body, hint]).setDepth(10);
  }

  private closeLog(): void {
    this.logPanel?.destroy();
    this.logPanel = undefined;
  }

  // ------------------------------------------------------------------- chime

  private moveChime(reason: 'timer' | 'wrong-code'): void {
    this.chimeState = advanceChime(this.chimeState, reason);
    this.refreshChime();
    if (this.chimeState.caught) {
      this.finish('caught');
      return;
    }
    this.playCreak();
    this.chimeSprite?.moveTo(this.chimeState.point);
    this.atmosphere?.setStage(this.chimeState.step);
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
    // A closeup that is already open stays usable when its area gets locked; only new entries are blocked.
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
    this.blip(() => sfx.playError());
    this.moveChime('wrong-code');
  }

  // ----------------------------------------------------------------- endings

  private finish(outcome: 'win' | 'caught' | 'timeout'): void {
    if (!this.running) return;
    this.running = false;
    this.keypad?.setLocked(true);
    this.closeCloseup();
    this.closeLog();
    this.pulse?.stop();
    const data = { outcome: outcome === 'win' ? 'win' : 'lose', seed: this.seed };
    if (outcome === 'win') {
      this.blip(() => sfx.playClueFound());
      openLiftDoors(this, () => this.scene.start('EndScene', data));
      return;
    }
    this.playJumpscare(() => this.scene.start('EndScene', data));
  }

  /** At most one second, a single red flash (never faster than 3 per second), calm when reduced motion is on. */
  private playJumpscare(done: () => void): void {
    this.play('snd-jumpscare', 0.9);
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

  /** Dev only: finds the code one position at a time through submitCode (80 calls, not 10^8). */
  private devSolve(): string | null {
    const all = new Set<ClueId>(CLUE_IDS);
    const digits = new Array<number>(CODE_LENGTH).fill(0);
    for (let pos = 0; pos < CODE_LENGTH; pos++) {
      let best = 0;
      let bestOk = -1;
      for (let d = 0; d <= 9; d++) {
        const trial = digits.slice();
        trial[pos] = d;
        const ok = submitCode(this.puzzle, trial.join(''), all).results.filter((r) => r.ok).length;
        if (ok > bestOk) {
          bestOk = ok;
          best = d;
        }
      }
      digits[pos] = best;
    }
    const code = digits.join('');
    return submitCode(this.puzzle, code, all).pass ? code : null;
  }

  /** Largest whole-number scale at which a prop texture fits inside its hotspot. */
  private fitScale(key: string, clue: ClueInstance): number {
    const src = this.textures.get(key).getSourceImage();
    return Math.max(1, Math.floor(Math.min(clue.width / src.width, clue.height / src.height)));
  }

  /** Synth blips from the sound manager honour the mute toggle (Phaser sounds do it themselves). */
  private blip(fn: () => void): void {
    if (!this.sound.mute) fn();
  }

  private play(key: string, volume: number): void {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private playCreak(): void {
    const n = Phaser.Math.Between(1, 3);
    this.play(`snd-creak${n}`, 0.7);
    this.blip(() => sfx.playChimeStep());
  }

  private startAmbient(): void {
    if (!this.cache.audio.exists('snd-ambient')) return;
    const ambient = this.sound.add('snd-ambient', { loop: true, volume: 0.3 });
    ambient.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ambient.destroy());
  }

  private formatTime(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
