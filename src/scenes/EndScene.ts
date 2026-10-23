import Phaser from 'phaser';
import { GAME_WIDTH, PALETTE } from '../config';
import { createPuzzle, verifyPuzzle } from '../game/rules';
import type { ProofReport } from '../game/types';
import { addMuteToggle } from '../ui';

const FONT = 'Courier New, monospace';

interface EndData {
  outcome?: 'win' | 'lose';
  seed?: string;
}

const LORE_WIN = [
  'The lift hums, then opens.',
  'Six paper hats sit on the floor behind you, and one of them is still warm.',
  'Somewhere above, a bell rings once. Nobody is there to answer it.',
];
const LORE_LOSE = [
  'The bell rings at your shoulder.',
  'The lights go out before the doors close. Nothing else is shown.',
  'In the morning, the night custodian finds your flashlight on the floor.',
];

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export class EndScene extends Phaser.Scene {
  private outcome: 'win' | 'lose' = 'lose';
  private seed = '';

  constructor() {
    super('EndScene');
  }

  init(data: EndData): void {
    this.outcome = data.outcome ?? 'lose';
    this.seed = data.seed ?? '';
  }

  create(): void {
    const won = this.outcome === 'win';
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    this.add.text(GAME_WIDTH / 2, 56, won ? 'THE LIFT OPENS' : 'CHIME GOT YOU', {
      color: css(won ? PALETTE.lamp : PALETTE.danger),
      fontFamily: FONT,
      fontSize: '36px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 150, (won ? LORE_WIN : LORE_LOSE).join('\n\n'), {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '15px',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 640 },
    }).setOrigin(0.5, 0);

    this.drawProofPanel();
    this.drawPlayAgain();
    addMuteToggle(this, GAME_WIDTH - 8, 6);
  }

  private drawProofPanel(): void {
    const x = GAME_WIDTH / 2;
    const y = 318;
    this.add.rectangle(x, y + 52, 560, 110, 0x211b2e).setStrokeStyle(2, PALETTE.muted);
    this.add.text(x, y + 6, 'PUZZLE PROOF', {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '13px',
    }).setOrigin(0.5);

    let lines: string;
    if (this.seed === '') {
      lines = 'No seed to check.';
    } else {
      const report: ProofReport = verifyPuzzle(createPuzzle(this.seed));
      const weakest = Math.min(...report.necessity.map((n) => n.solutionsWithout));
      lines = [
        `Seed ${report.seed}: checked ${report.checks} digit tests across ${report.candidates.toLocaleString()} possible codes.`,
        `Codes satisfying every clue: ${report.solutions} (${report.unique ? 'unique' : 'NOT unique'}).`,
        `Drop any one clue and at least ${weakest.toLocaleString()} codes remain (${report.allNecessary ? 'every clue needed' : 'a clue is redundant'}).`,
      ].join('\n');
    }
    this.add.text(x, y + 28, lines, {
      color: css(PALETTE.paper),
      fontFamily: FONT,
      fontSize: '12px',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 530 },
    }).setOrigin(0.5, 0);
  }

  private drawPlayAgain(): void {
    const x = GAME_WIDTH / 2;
    const y = 462;
    const button = this.add.rectangle(x, y, 260, 52, PALETTE.ink)
      .setStrokeStyle(2, PALETTE.lamp)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, this.outcome === 'win' ? 'PLAY AGAIN' : 'TRY AGAIN', {
      color: css(PALETTE.lamp),
      fontFamily: FONT,
      fontSize: '18px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    // Fresh seed every time: RoomScene picks one when no seed is passed in.
    const restart = (): void => {
      this.scene.start('RoomScene', {});
    };
    button.on('pointerover', () => {
      button.setFillStyle(PALETTE.lamp);
      label.setColor(css(PALETTE.ink));
    });
    button.on('pointerout', () => {
      button.setFillStyle(PALETTE.ink);
      label.setColor(css(PALETTE.lamp));
    });
    button.on('pointerup', restart);
    this.input.keyboard?.once('keydown-ENTER', restart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', restart);
    });
  }
}
