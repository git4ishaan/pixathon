import Phaser from 'phaser';
import { PALETTE } from './config';

export interface RuleRow {
  text: string;
  pass: boolean;
}

const CODE_LENGTH = 6;
const WIDTH = 280;
const SLOT_W = 40;
const SLOT_H = 40;
const SLOT_GAP = (WIDTH - CODE_LENGTH * SLOT_W) / (CODE_LENGTH - 1);

const COLS = 7;
const KEY_PITCH_X = WIDTH / COLS;
const KEY_PITCH_Y = 34;
const KEY_H = KEY_PITCH_Y - 3;
const KEYS_TOP = SLOT_H + 8;

const NOTE_TOP = KEYS_TOP + 6 * KEY_PITCH_Y + 2;
const CHECKLIST_TOP = NOTE_TOP + 34;
const CHECKLIST_BOTTOM = 475;
const ROW_GAP = 3;

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*!';
const PASS_COLOR = '#6fcf7f';
const FAIL_COLOR = '#e5706f';
const FONT = 'Courier New, monospace';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export class Keypad extends Phaser.GameObjects.Container {
  onChange: (code: string) => void = () => {};
  onSubmit: (code: string) => void = () => {};

  private code = '';
  private readonly slotTexts: Phaser.GameObjects.Text[] = [];
  private readonly slotBoxes: Phaser.GameObjects.Rectangle[] = [];
  private readonly ruleTexts: Phaser.GameObjects.Text[] = [];

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

  getCode(): string {
    return this.code;
  }

  clear(): void {
    if (this.code === '') return;
    this.code = '';
    this.refreshDisplay();
    this.onChange(this.code);
  }

  setRules(rows: RuleRow[]): void {
    for (const t of this.ruleTexts) t.destroy();
    this.ruleTexts.length = 0;

    let y = CHECKLIST_TOP;
    for (const row of rows) {
      const t = this.scene.add.text(0, y, `${row.pass ? '[x]' : '[ ]'} ${row.text}`, {
        color: row.pass ? PASS_COLOR : FAIL_COLOR,
        fontFamily: FONT,
        fontSize: '11px',
        wordWrap: { width: WIDTH, useAdvancedWrap: true },
      });
      if (y + t.height > CHECKLIST_BOTTOM) {
        t.destroy();
        break;
      }
      this.add(t);
      this.ruleTexts.push(t);
      y += t.height + ROW_GAP;
    }
  }

  private buildDisplay(): void {
    for (let i = 0; i < CODE_LENGTH; i++) {
      const cx = i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      const box = this.scene.add.rectangle(cx, SLOT_H / 2, SLOT_W, SLOT_H, PALETTE.ink)
        .setStrokeStyle(2, PALETTE.muted);
      const text = this.scene.add.text(cx, SLOT_H / 2, '', {
        color: hex(PALETTE.lamp),
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add([box, text]);
      this.slotBoxes.push(box);
      this.slotTexts.push(text);
    }
    this.refreshDisplay();
  }

  private buildKeys(): void {
    CHARS.split('').forEach((ch, i) => {
      this.addButton(i % COLS, Math.floor(i / COLS), 1, ch, () => this.typeChar(ch));
    });
    const lastRow = Math.floor(CHARS.length / COLS);
    const lastCol = CHARS.length % COLS;
    this.addButton(lastCol, lastRow, 1, '<', () => this.backspace());
    this.addButton(lastCol + 1, lastRow, COLS - lastCol - 1, 'ENTER', () => this.submit());
  }

  private addButton(col: number, row: number, span: number, label: string, action: () => void): void {
    const w = KEY_PITCH_X * span - 3;
    const cx = col * KEY_PITCH_X + w / 2;
    const cy = KEYS_TOP + row * KEY_PITCH_Y + KEY_H / 2;
    const isAction = label === '<' || label === 'ENTER';
    const base = isAction ? PALETTE.lamp : PALETTE.paper;

    const box = this.scene.add.rectangle(cx, cy, w, KEY_H, base)
      .setStrokeStyle(1, PALETTE.ink)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(cx, cy, label, {
      color: hex(PALETTE.ink),
      fontFamily: FONT,
      fontSize: label === 'ENTER' ? '13px' : '16px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    box.on('pointerover', () => box.setFillStyle(PALETTE.lamp));
    box.on('pointerout', () => box.setFillStyle(base));
    box.on('pointerdown', () => box.setFillStyle(PALETTE.muted));
    box.on('pointerup', () => {
      box.setFillStyle(base);
      action();
    });
    this.add([box, text]);
  }

  private buildNote(): void {
    const note = this.scene.add.text(0, NOTE_TOP, 'Demo only. Never enter a real password.', {
      color: hex(PALETTE.muted),
      fontFamily: FONT,
      fontSize: '11px',
      wordWrap: { width: WIDTH },
    });
    this.add(note);
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Backspace') {
      this.backspace();
    } else if (event.key === 'Enter') {
      this.submit();
    } else if (event.key.length === 1) {
      const ch = event.key.toUpperCase();
      if (CHARS.includes(ch)) this.typeChar(ch);
    }
  }

  private typeChar(ch: string): void {
    if (this.code.length >= CODE_LENGTH) return;
    this.code += ch;
    this.refreshDisplay();
    this.onChange(this.code);
  }

  private backspace(): void {
    if (this.code === '') return;
    this.code = this.code.slice(0, -1);
    this.refreshDisplay();
    this.onChange(this.code);
  }

  private submit(): void {
    this.onSubmit(this.code);
  }

  private refreshDisplay(): void {
    for (let i = 0; i < CODE_LENGTH; i++) {
      this.slotTexts[i].setText(this.code[i] ?? '');
      this.slotBoxes[i].setStrokeStyle(2, i === this.code.length ? PALETTE.lamp : PALETTE.muted);
    }
  }
}
