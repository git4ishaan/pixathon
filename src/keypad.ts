import Phaser from 'phaser';
import { keyClick } from './audio/sfx';
import { PALETTE } from './config';
import type { ClueId, SubmissionResult } from './game/types';

const CODE_LENGTH = 6;
const WIDTH = 280;
const SLOT_W = 40;
const SLOT_H = 40;
const SLOT_TOP = 3; // keeps the slot outline clear of the header bar
const SLOT_GAP = (WIDTH - CODE_LENGTH * SLOT_W) / (CODE_LENGTH - 1);

// 3 columns x 4 rows plus a full-width submit. Keys are 62 canvas px tall: the canvas is
// FIT-scaled, so they reach 44 CSS px once the scale is >= ~0.71 (a landscape phone at
// least ~384 CSS px tall). Portrait phones are not handled yet.
const COLS = 3;
const KEY_GAP = 2;
const KEY_W = (WIDTH - KEY_GAP * (COLS - 1)) / COLS;
const KEY_H = 62;
const KEYS_TOP = SLOT_TOP + SLOT_H + 4;
const SUBMIT_TOP = KEYS_TOP + 4 * (KEY_H + KEY_GAP);

const NOTE_TOP = SUBMIT_TOP + KEY_H + 4;
const RESULT_TOP = NOTE_TOP + 18;
const RESULT_ROW_H = 14;
const RESULT_COL_W = WIDTH / 2;

const PASS_COLOR = '#6fcf7f';
const FAIL_COLOR = '#e5706f';
const FONT = 'Courier New, monospace';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const clueName = (id: ClueId): string => id.replace(/-/g, ' ');

type KeyAction = 'delete' | 'clear' | 'submit' | { digit: string };

export class Keypad extends Phaser.GameObjects.Container {
  private code = '';
  private locked = false;
  private submitCb: (code: string) => void = () => {};
  private readonly slotTexts: Phaser.GameObjects.Text[] = [];
  private readonly slotBoxes: Phaser.GameObjects.Rectangle[] = [];
  private resultObjects: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.buildDisplay();
    this.buildKeys();
    this.buildNote();
    scene.add.existing(this as Phaser.GameObjects.Container);

    scene.input.keyboard?.on('keydown', this.handleKey, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.keyboard?.off('keydown', this.handleKey, this);
    });
  }

  onSubmit(cb: (code: string) => void): void {
    this.submitCb = cb;
  }

  getCode(): string {
    return this.code;
  }

  /** Clear the code and any result: a fresh round. Unlocks input. */
  reset(): void {
    this.code = '';
    this.locked = false;
    this.setResult(null);
    this.refreshDisplay();
  }

  /** Ignore all input (end states). */
  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  /** Show pass/fail per discovered clue. Only call after a submission; null clears it. */
  setResult(result: SubmissionResult | null): void {
    for (const t of this.resultObjects) t.destroy();
    this.resultObjects = [];
    if (result === null) return;

    const title = this.scene.add.text(0, RESULT_TOP - 1, result.pass ? 'ALL CLUES SATISFIED' : 'NOT YET. CHECK THE CLUES:', {
      color: result.pass ? PASS_COLOR : hex(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '11px',
      fontStyle: 'bold',
    });
    this.add(title);
    this.resultObjects.push(title);

    result.results.forEach((r, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const t = this.scene.add.text(
        col * RESULT_COL_W,
        RESULT_TOP + 14 + row * RESULT_ROW_H,
        `${r.ok ? '+' : 'x'} ${clueName(r.clueId)}`,
        { color: r.ok ? PASS_COLOR : FAIL_COLOR, fontFamily: FONT, fontSize: '11px' },
      );
      this.add(t);
      this.resultObjects.push(t);
    });
  }

  private buildDisplay(): void {
    for (let i = 0; i < CODE_LENGTH; i++) {
      const cx = i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      const box = this.scene.add.rectangle(cx, SLOT_TOP + SLOT_H / 2, SLOT_W, SLOT_H, PALETTE.ink)
        .setStrokeStyle(2, PALETTE.muted);
      const text = this.scene.add.text(cx, SLOT_TOP + SLOT_H / 2, '', {
        color: hex(PALETTE.lamp),
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add([box, text]);
      this.slotBoxes.push(box);
      this.slotTexts.push(text);
    }
    this.refreshDisplay();
  }

  private buildKeys(): void {
    const layout: { label: string; action: KeyAction }[] = [
      ...'123456789'.split('').map((d) => ({ label: d, action: { digit: d } })),
      { label: 'CLR', action: 'clear' },
      { label: '0', action: { digit: '0' } },
      { label: 'DEL', action: 'delete' },
    ];
    layout.forEach((k, i) => {
      const cx = (i % COLS) * (KEY_W + KEY_GAP) + KEY_W / 2;
      const cy = KEYS_TOP + Math.floor(i / COLS) * (KEY_H + KEY_GAP) + KEY_H / 2;
      this.addButton(cx, cy, KEY_W, k.label, k.action);
    });
    this.addButton(WIDTH / 2, SUBMIT_TOP + KEY_H / 2, WIDTH, 'SUBMIT', 'submit');
  }

  private addButton(cx: number, cy: number, w: number, label: string, action: KeyAction): void {
    const isDigit = typeof action === 'object';
    const base = isDigit ? PALETTE.paper : PALETTE.lamp;

    const box = this.scene.add.rectangle(cx, cy, w, KEY_H, base)
      .setStrokeStyle(2, PALETTE.ink)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(cx, cy, label, {
      color: hex(PALETTE.ink),
      fontFamily: FONT,
      fontSize: isDigit ? '24px' : '18px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    box.on('pointerover', () => box.setFillStyle(isDigit ? PALETTE.lamp : PALETTE.paper));
    box.on('pointerout', () => box.setFillStyle(base));
    box.on('pointerdown', () => box.setFillStyle(PALETTE.muted));
    box.on('pointerup', () => {
      box.setFillStyle(base);
      this.press(action);
    });
    this.add([box, text]);
  }

  private buildNote(): void {
    this.add(this.scene.add.text(0, NOTE_TOP, 'Demo only. Never enter a real password.', {
      color: hex(PALETTE.muted),
      fontFamily: FONT,
      fontSize: '11px',
      wordWrap: { width: WIDTH },
    }));
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Backspace') this.press('delete');
    else if (event.key === 'Enter') this.press('submit');
    else if (/^[0-9]$/.test(event.key)) this.press({ digit: event.key });
  }

  private press(action: KeyAction): void {
    if (this.locked) return;
    keyClick(this.scene);
    if (action === 'delete') {
      this.code = this.code.slice(0, -1);
    } else if (action === 'clear') {
      this.code = '';
    } else if (action === 'submit') {
      if (this.code.length === CODE_LENGTH) this.submitCb(this.code);
      else this.flashIncomplete();
      return;
    } else if (this.code.length < CODE_LENGTH) {
      this.code += action.digit;
    }
    this.refreshDisplay();
  }

  /** Submit pressed before six digits: outline the empty slots so it is clear why nothing happened. */
  private flashIncomplete(): void {
    for (let i = this.code.length; i < CODE_LENGTH; i++) this.slotBoxes[i].setStrokeStyle(2, PALETTE.danger);
    this.scene.time.delayedCall(400, () => {
      if (this.active) this.refreshDisplay();
    });
  }

  private refreshDisplay(): void {
    for (let i = 0; i < CODE_LENGTH; i++) {
      this.slotTexts[i].setText(this.code[i] ?? '');
      this.slotBoxes[i].setStrokeStyle(2, i === this.code.length ? PALETTE.lamp : PALETTE.muted);
    }
  }
}
