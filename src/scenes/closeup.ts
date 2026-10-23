import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { PALETTE, reducedMotion } from '../config';
import { stationDigit } from '../game/rules';
import { assignFragments } from '../game/stations';
import type { ClueId } from '../game/types';

/**
 * Closeup of one prop. Sub-props are tappable parts with idle / hover / pressed / revealed
 * states; revealing one adds its text fragments to the evidence. Art is procedural.
 * Local coordinates: 680 x 386, origin at the room view's top-left (y = 64 on the canvas).
 */
export const CLOSEUP_W = 680;
export const CLOSEUP_H = 386;
const STAGE_Y = 18;
const FONT = 'Courier New, monospace';
const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** p: reveal progress 0..1 (animated). hover/pressed are interaction states. */
interface DrawState {
  /** Untapped part with evidence in it: glows to say "tap me". */
  hint: boolean;
  p: number;
  hover: boolean;
  pressed: boolean;
  t: number;
}

interface Slot {
  label: string;
  hit: Rect[];
  draw: (g: Phaser.GameObjects.Graphics, s: DrawState) => void;
  /** Spoken to the player when the slot has no evidence fragment. */
  flavour?: string;
  sound?: 'click' | 'radio';
}

interface StationArt {
  backdrop: (g: Phaser.GameObjects.Graphics) => void;
  captions?: { x: number; y: number; text: string; size?: number; color?: number }[];
  slots: Slot[];
}

const P = PALETTE;

function box(g: Phaser.GameObjects.Graphics, c: number, r: Rect, a = 1): void {
  g.fillStyle(c, a);
  g.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
}
function frame(g: Phaser.GameObjects.Graphics, c: number, r: Rect, w = 2): void {
  g.lineStyle(w, c, 1);
  g.strokeRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
}
const r4 = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
/** Highlight ring shared by every slot: hover brightens, pressed thickens. */
function ring(g: Phaser.GameObjects.Graphics, s: DrawState, rects: Rect[]): void {
  if (s.hint && !s.hover && !s.pressed) {
    // Slow glow (about 0.8 Hz). A steady ring under reduced motion, so motion is never the only cue.
    const a = reducedMotion() ? 0.8 : 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(s.t / 320));
    g.lineStyle(3, P.lamp, a);
    for (const r of rects) g.strokeRect(Math.round(r.x - 3), Math.round(r.y - 3), Math.round(r.w + 6), Math.round(r.h + 6));
    return;
  }
  if (!s.hover && !s.pressed) return;
  for (const r of rects) frame(g, s.pressed ? P.paper : P.lamp, r4(r.x - 3, r.y - 3, r.w + 6, r.h + 6), s.pressed ? 3 : 2);
}
/** Horizontal squash used for flips: 1 -> 0 -> 1 across p, plus which face shows. */
function flip(p: number): { k: number; front: boolean } {
  return { k: Math.max(0.05, Math.abs(1 - 2 * p)), front: p >= 0.5 };
}

// ------------------------------------------------------------------ stations

function partyTable(markedSeat: number, candles: number): StationArt {
  const cardX = (i: number): number => 40 + i * 76;
  const cardY = 92;
  const cardRect = (i: number): Rect => r4(cardX(i), cardY, 60, 92);
  const marked = Math.min(7, Math.max(0, markedSeat - 1));
  const others = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== marked);
  const face = (g: Phaser.GameObjects.Graphics, i: number, p: number, withCandles: boolean): void => {
    const r = cardRect(i);
    const { k, front } = flip(p);
    const w = r.w * k;
    const x = r.x + (r.w - w) / 2;
    box(g, front ? P.paper : P.dusk, r4(x, r.y, w, r.h));
    frame(g, P.ink, r4(x, r.y, w, r.h), 2);
    if (!front) {
      box(g, P.plum, r4(x + w * 0.2, r.y + 12, w * 0.6, r.h - 24));
    } else if (withCandles && k > 0.7) {
      for (let c = 0; c < candles; c++) {
        const cx = x + 6 + (c % 5) * 10;
        const cy = r.y + 18 + Math.floor(c / 5) * 34;
        box(g, P.danger, r4(cx, cy + 6, 4, 14));
        box(g, P.lamp, r4(cx, cy, 4, 6));
      }
    }
  };
  return {
    backdrop: (g) => {
      box(g, P.wood, r4(20, 188, 640, 48));
      box(g, P.brass, r4(20, 188, 640, 4));
      box(g, P.plum, r4(20, 236, 640, 8));
      // paper hats between the cards
      for (let i = 0; i < 7; i++) {
        g.fillStyle(i % 2 ? P.danger : P.lamp, 1);
        g.fillTriangle(cardX(i) + 68 - 7, 188, cardX(i) + 68, 168, cardX(i) + 68 + 7, 188);
      }
    },
    captions: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: cardX(i) + 30, y: cardY + 106, text: String(i + 1), size: 14, color: P.paper })),
    slots: [
      {
        label: 'Place-card sign',
        hit: [r4(240, 46, 200, 30)],
        draw: (g, s) => {
          box(g, P.brass, r4(240, 46, 200, 30));
          frame(g, P.ink, r4(240, 46, 200, 30));
          box(g, s.p > 0 ? P.lamp : P.wood, r4(248, 54, 184, 14), 0.5);
          ring(g, s, [r4(240, 46, 200, 30)]);
        },
      },
      {
        label: 'Marked card',
        hit: [cardRect(marked)],
        draw: (g, s) => {
          face(g, marked, s.p, true);
          ring(g, s, [cardRect(marked)]);
        },
      },
      {
        label: 'Other cards',
        hit: others.map(cardRect),
        draw: (g, s) => {
          for (const i of others) face(g, i, s.p, false);
          ring(g, s, s.hover || s.pressed ? others.map(cardRect) : []);
        },
        flavour: 'Blank cards, all of them.',
      },
    ],
  };
}

function lobbyDisplay(guests: number): StationArt {
  const count = Math.min(10, guests + 1);
  const pitch = Math.min(74, 480 / count);
  const fx = (i: number): number => 340 - ((count - 1) * pitch) / 2 + i * pitch;
  const attendant = count - 1;
  const figure = (g: Phaser.GameObjects.Graphics, i: number, badge: boolean, p: number, hover: boolean): void => {
    const x = fx(i);
    box(g, P.dusk, r4(x - 18, 104, 36, 46));
    box(g, P.paper, r4(x - 12, 76, 24, 26));
    box(g, P.ink, r4(x - 7, 86, 4, 4));
    box(g, P.ink, r4(x + 3, 86, 4, 4));
    if (badge) {
      box(g, P.danger, r4(x - 14, 68, 28, 10));
      box(g, P.brass, r4(x - 4, 116, 12, 10), 0.6 + 0.4 * p);
      if (p > 0) box(g, P.lamp, r4(x - 3, 117, 10, 8));
    }
    if (hover) box(g, P.lamp, r4(x - 20, 150, 40, 3), 0.8);
  };
  return {
    backdrop: (g) => {
      box(g, P.night, r4(70, 58, 540, 150));
      frame(g, P.brass, r4(70, 58, 540, 150), 4);
      box(g, P.wood, r4(70, 208, 540, 28));
      box(g, P.paper, r4(70, 58, 540, 3), 0.2);
    },
    slots: [
      {
        label: 'Case tag',
        hit: [r4(270, 206, 140, 26)],
        draw: (g, s) => {
          box(g, P.brass, r4(270, 206, 140, 26));
          frame(g, P.ink, r4(270, 206, 140, 26));
          box(g, s.p > 0 ? P.paper : P.wood, r4(278, 214, 124, 10), 0.6);
          ring(g, s, [r4(270, 206, 140, 26)]);
        },
      },
      {
        label: 'Attendant with badge',
        hit: [r4(fx(attendant) - 20, 66, 40, 88)],
        draw: (g, s) => {
          figure(g, attendant, true, s.p, false);
          ring(g, s, [r4(fx(attendant) - 20, 66, 40, 88)]);
        },
      },
      {
        label: 'Figures',
        hit: Array.from({ length: attendant }, (_, i) => r4(fx(i) - 20, 74, 40, 80)),
        draw: (g, s) => {
          for (let i = 0; i < attendant; i++) figure(g, i, false, 0, s.hover);
          ring(g, s, s.pressed ? Array.from({ length: attendant }, (_, i) => r4(fx(i) - 20, 74, 40, 80)) : []);
        },
        flavour: 'Painted eyes. They seem to follow you. Nothing else of note.',
      },
    ],
  };
}

function missingPoster(): StationArt {
  const sheet = r4(210, 44, 260, 196);
  return {
    backdrop: (g) => {
      box(g, P.dusk, r4(150, 36, 380, 214));
      box(g, P.paper, r4(sheet.x + 6, sheet.y + 6, sheet.w, sheet.h), 0.12);
    },
    slots: [
      {
        label: 'Headline',
        hit: [r4(226, 52, 228, 44)],
        draw: (g, s) => {
          box(g, P.paper, sheet);
          box(g, P.danger, r4(226, 52, 228, 44), 0.9);
          box(g, P.paper, r4(244, 66, 192, 8), 0.8);
          box(g, P.paper, r4(262, 80, 156, 6), 0.5 + 0.5 * s.p);
          ring(g, s, [r4(226, 52, 228, 44)]);
        },
      },
      {
        label: 'Her details',
        hit: [r4(226, 104, 228, 74)],
        draw: (g, s) => {
          box(g, P.muted, r4(236, 108, 56, 64));
          box(g, P.ink, r4(252, 126, 6, 6));
          box(g, P.ink, r4(268, 126, 6, 6));
          for (let i = 0; i < 4; i++) box(g, P.ink, r4(304, 112 + i * 14, 140 - (i % 2) * 40, 5), 0.4 + 0.6 * s.p);
          ring(g, s, [r4(226, 104, 228, 74)]);
        },
      },
      {
        label: 'Stapled corner',
        hit: [r4(404, 186, 66, 54)],
        draw: (g, s) => {
          const lift = s.p * 18;
          box(g, P.paper, r4(404, 186, 66, 54));
          box(g, P.brass, r4(440, 214 - lift, 24, 20), 0.95);
          if (s.p > 0.4) box(g, P.ink, r4(448, 218 - lift, 8, 8));
          g.fillStyle(P.muted, 1);
          g.fillTriangle(404, 240, 470, 240 - lift * 2.2, 470, 240);
          g.fillStyle(P.paper, 1);
          g.fillTriangle(404, 240, 404 + lift * 2, 240 - lift * 2, 404 + lift * 2 + 4, 240);
          ring(g, s, [r4(404, 186, 66, 54)]);
        },
      },
    ],
  };
}

function wallCalendar(): StationArt {
  const june = r4(146, 70, 170, 176);
  const may = r4(364, 70, 170, 176);
  const page = (g: Phaser.GameObjects.Graphics, r: Rect, head: number, p: number, note: number): void => {
    box(g, P.paper, r);
    box(g, head, r4(r.x, r.y, r.w, 28));
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) box(g, P.muted, r4(r.x + 14 + i * 29, r.y + 42 + j * 22, 20, 14), 0.35);
    if (p > 0) {
      box(g, P.ink, r4(r.x + 14, r.y + 138, 140 * p, 5), 0.85);
      box(g, P.ink, r4(r.x + 14, r.y + 150, 100 * p, 5), 0.85);
    }
    box(g, P.lamp, r4(r.x + 14 + note * 29 - 3, r.y + 38 + 66 - 3, 26, 20), p > 0 ? 0.55 : 0);
  };
  return {
    backdrop: (g) => {
      box(g, P.dusk, r4(110, 40, 460, 214));
      box(g, P.wood, r4(110, 40, 460, 8));
    },
    slots: [
      {
        label: 'Pins',
        hit: [r4(318, 52, 44, 26)],
        draw: (g, s) => {
          g.lineStyle(3, P.danger, 1);
          g.lineBetween(231, 74, 340, 62);
          g.lineBetween(340, 62, 449, 74);
          box(g, P.danger, r4(331, 53, 18, 18));
          box(g, P.paper, r4(336, 58, 5, 5), 0.6 + 0.4 * s.p);
          ring(g, s, [r4(318, 52, 44, 26)]);
        },
      },
      {
        label: 'June page',
        hit: [june],
        draw: (g, s) => {
          page(g, june, P.danger, s.p, 3);
          ring(g, s, [june]);
        },
      },
      {
        label: 'May page',
        hit: [may],
        draw: (g, s) => {
          page(g, may, P.dusk, 0, 2);
          if (s.p > 0) {
            g.lineStyle(6, P.danger, 0.9);
            g.lineBetween(may.x + 10, may.y + 10, may.x + 10 + (may.w - 20) * s.p, may.y + 10 + (may.h - 20) * s.p);
            g.lineBetween(may.x + may.w - 10, may.y + 10, may.x + may.w - 10 - (may.w - 20) * s.p, may.y + 10 + (may.h - 20) * s.p);
          }
          ring(g, s, [may]);
        },
      },
    ],
  };
}

function radio(): StationArt {
  const body = r4(150, 70, 380, 170);
  const dialC = { x: 250, y: 160 };
  return {
    backdrop: (g) => {
      box(g, P.wood, r4(130, 240, 420, 14));
      box(g, P.brass, body);
      box(g, P.wood, r4(body.x + 6, body.y + 6, body.w - 12, body.h - 12));
    },
    slots: [
      {
        label: 'Power knob',
        hit: [r4(460, 104, 50, 50)],
        sound: 'click',
        draw: (g, s) => {
          g.fillStyle(P.paper, 1);
          g.fillCircle(485, 129, 22);
          g.fillStyle(P.ink, 1);
          g.fillCircle(485, 129, 17);
          const a = -2.2 + s.p * 2.4;
          g.lineStyle(3, P.lamp, 1);
          g.lineBetween(485, 129, 485 + Math.cos(a) * 16, 129 + Math.sin(a) * 16);
          if (s.p > 0) {
            box(g, P.lamp, r4(466, 168, 38, 6));
            // pulses: slow blink so nothing flashes faster than 3 per second
            const on = Math.floor(s.t / 400) % 2 === 0;
            box(g, on ? P.danger : P.blood, r4(476, 82, 18, 8));
          }
          ring(g, s, [r4(460, 104, 50, 50)]);
        },
      },
      {
        label: 'Tuning dial',
        hit: [r4(dialC.x - 70, dialC.y - 56, 140, 112)],
        sound: 'click',
        draw: (g, s) => {
          box(g, P.night, r4(dialC.x - 66, dialC.y - 40, 132, 80));
          for (let i = 0; i < 9; i++) box(g, P.muted, r4(dialC.x - 56 + i * 14, dialC.y - 30, 2, i % 4 === 0 ? 16 : 9));
          box(g, P.danger, r4(dialC.x - 56 + s.p * 100, dialC.y - 34, 3, 56));
          ring(g, s, [r4(dialC.x - 70, dialC.y - 56, 140, 112)]);
        },
      },
      {
        label: 'Speaker grille',
        hit: [r4(330, 100, 110, 100)],
        sound: 'radio',
        draw: (g, s) => {
          box(g, P.night, r4(330, 100, 110, 100));
          for (let i = 0; i < 8; i++) {
            const jitter = s.p > 0 ? Math.sin(s.t / 90 + i) * 4 : 0;
            box(g, s.p > 0 ? P.muted : P.dusk, r4(338, 108 + i * 11 + jitter, 94, 5));
          }
          ring(g, s, [r4(330, 100, 110, 100)]);
        },
      },
    ],
  };
}

function ticketStub(): StationArt {
  const t = r4(210, 74, 260, 120);
  return {
    backdrop: (g) => {
      box(g, P.wood, r4(150, 194, 380, 44));
      box(g, P.brass, r4(150, 194, 380, 4));
    },
    slots: [
      {
        label: 'Ticket front',
        hit: [r4(t.x, t.y, 130, t.h)],
        sound: 'click',
        draw: (g, s) => {
          box(g, P.paper, r4(t.x, t.y, 130, t.h));
          box(g, P.danger, r4(t.x + 10, t.y + 12, 110, 14));
          box(g, P.ink, r4(t.x + 10, t.y + 44, 70 + 30 * s.p, 10), 0.8);
          box(g, P.ink, r4(t.x + 10, t.y + 66, 50, 6), 0.5);
          ring(g, s, [r4(t.x, t.y, 130, t.h)]);
        },
      },
      {
        label: 'Flip it over',
        hit: [r4(t.x + 130, t.y, 130, t.h)],
        sound: 'click',
        draw: (g, s) => {
          const { k, front } = flip(s.p);
          const w = 130 * k;
          const x = t.x + 130 + (130 - w) / 2;
          box(g, front ? P.muted : P.paper, r4(x, t.y, w, t.h));
          if (front && k > 0.6) {
            for (let i = 0; i < 3; i++) box(g, P.ink, r4(x + 10, t.y + 22 + i * 22, w - 20 - i * 16, 4), 0.7);
          } else if (!front) {
            box(g, P.dusk, r4(x + 8, t.y + 8, Math.max(0, w - 16), 3), 0.5);
          }
          ring(g, s, [r4(t.x + 130, t.y, 130, t.h)]);
        },
      },
      {
        label: 'Counter',
        hit: [r4(150, 198, 380, 40)],
        draw: (g, s) => {
          if (s.hover) box(g, P.lamp, r4(150, 196, 380, 2), 0.8);
        },
        flavour: 'Scuffed wood. Someone has carved a tiny bell into it.',
      },
    ],
  };
}

function plaque(): StationArt {
  const plate = r4(130, 58, 420, 160);
  return {
    backdrop: (g) => {
      box(g, P.wood, r4(110, 44, 460, 190));
    },
    slots: [
      {
        label: 'Engraved text',
        hit: [r4(plate.x + 14, plate.y + 12, plate.w - 28, 56)],
        draw: (g, s) => {
          box(g, P.brass, plate);
          frame(g, P.paper, r4(plate.x + 4, plate.y + 4, plate.w - 8, plate.h - 8), 1);
          const rows = [plate.w - 70, plate.w - 120, plate.w - 90];
          rows.forEach((w, i) => box(g, s.p > 0 ? P.ink : P.wood, r4(plate.x + 20, plate.y + 18 + i * 16, w, 6), 0.8));
          ring(g, s, [r4(plate.x + 14, plate.y + 12, plate.w - 28, 56)]);
        },
      },
      {
        label: 'Guest record',
        hit: [r4(plate.x + 14, plate.y + 74, plate.w - 28, 30)],
        draw: (g, s) => {
          box(g, P.wood, r4(plate.x + 14, plate.y + 74, plate.w - 28, 30), 0.5);
          box(g, s.p > 0 ? P.ink : P.wood, r4(plate.x + 22, plate.y + 86, plate.w - 80, 6), 0.8);
          ring(g, s, [r4(plate.x + 14, plate.y + 74, plate.w - 28, 30)]);
        },
      },
      {
        label: 'Locker ledger',
        hit: [r4(plate.x + 14, plate.y + 110, plate.w - 28, 38)],
        draw: (g, s) => {
          box(g, P.wood, r4(plate.x + 14, plate.y + 110, plate.w - 28, 38), 0.5);
          for (let i = 0; i < 10; i++) box(g, s.p > 0 ? P.ink : P.wood, r4(plate.x + 22 + i * 38, plate.y + 120, 28, 8), 0.8);
          if (s.p > 0 && s.p < 1) box(g, P.paper, r4(plate.x + 14 + s.p * (plate.w - 40), plate.y + 108, 6, 42), 0.6);
          ring(g, s, [r4(plate.x + 14, plate.y + 110, plate.w - 28, 38)]);
        },
      },
    ],
  };
}

function servicePanel(): StationArt {
  const panel = r4(170, 46, 340, 196);
  const cover = r4(188, 60, 150, 98);
  const keys = (i: number): Rect => r4(196 + i * 52, 182, 40, 40);
  return {
    backdrop: (g) => {
      box(g, P.muted, panel);
      frame(g, P.ink, panel, 3);
    },
    slots: [
      {
        label: 'Panel label',
        hit: [r4(350, 60, 140, 42)],
        draw: (g, s) => {
          box(g, P.brass, r4(350, 60, 140, 42));
          box(g, s.p > 0 ? P.ink : P.wood, r4(358, 72, 124, 8), 0.7);
          box(g, s.p > 0 ? P.ink : P.wood, r4(358, 86, 80, 6), 0.7);
          ring(g, s, [r4(350, 60, 140, 42)]);
        },
      },
      {
        label: 'Cover',
        hit: [cover],
        draw: (g, s) => {
          // chart inside, then the cover swings open on its left hinge
          box(g, P.paper, cover);
          for (let i = 0; i < 3; i++) {
            box(g, P.ink, r4(cover.x + 12, cover.y + 14 + i * 26, 90, 5), 0.6 + 0.4 * s.p);
            box(g, P.danger, r4(cover.x + 112, cover.y + 12 + i * 26, 22, 10), 0.8);
          }
          const w = cover.w * (1 - s.p);
          if (w > 2) {
            box(g, P.dusk, r4(cover.x, cover.y, w, cover.h));
            frame(g, P.ink, r4(cover.x, cover.y, w, cover.h), 2);
          }
          ring(g, s, [cover]);
        },
      },
      {
        label: 'Worn keys',
        hit: [r4(190, 172, 320, 60)],
        draw: (g, s) => {
          for (let i = 0; i < 6; i++) {
            const worn = i === 1 || i === 4;
            box(g, worn && s.p > 0 ? P.lamp : P.paper, keys(i));
            frame(g, P.ink, keys(i), 2);
            if (worn && s.p > 0) box(g, P.brass, r4(keys(i).x + 10, keys(i).y + 10, 20, 20), 0.7);
          }
          ring(g, s, [r4(190, 172, 320, 60)]);
        },
      },
      {
        label: 'Most-worn key',
        hit: [r4(350, 112, 140, 50)],
        draw: (g, s) => {
          box(g, P.night, r4(350, 112, 140, 50));
          box(g, s.p > 0 ? P.lamp : P.dusk, r4(366, 122, 108, 30), s.p > 0 ? 0.35 : 0.8);
          if (s.p > 0) box(g, P.lamp, r4(404, 130, 32, 14));
          ring(g, s, [r4(350, 112, 140, 50)]);
        },
      },
    ],
  };
}

function stationArt(id: ClueId, observation: string): StationArt {
  switch (id) {
    case 'party-table': {
      const known = stationDigit(id, observation);
      return partyTable(known?.seat ?? 3, Math.min(9, known?.digit ?? 0));
    }
    case 'lobby-display': {
      const n = /holds (\d+) guest figures?/.exec(observation);
      return lobbyDisplay(n ? Number(n[1]) : 2);
    }
    case 'missing-poster':
      return missingPoster();
    case 'wall-calendar':
      return wallCalendar();
    case 'radio':
      return radio();
    case 'ticket-stub':
      return ticketStub();
    case 'plaque':
      return plaque();
    case 'service-panel':
      return servicePanel();
  }
}

// ------------------------------------------------------------------- closeup

export interface CloseupOptions {
  clueId: ClueId;
  title: string;
  observation: string;
  fragments: readonly string[];
  /** Indices already revealed (persisted by the scene across re-entry). */
  revealed: ReadonlySet<number>;
  /** Clicked hotspot in canvas px: the closeup zooms out of it. */
  origin: { x: number; y: number; w: number; h: number };
  /** "Needs: ..." line, or empty. */
  needsNote: string;
  onReveal: (indices: number[]) => void;
  onClose: () => void;
}

interface SlotView {
  slot: Slot;
  gfx: Phaser.GameObjects.Graphics;
  fragments: number[];
  progress: number;
  hover: boolean;
  pressed: boolean;
  tick: Phaser.GameObjects.Graphics;
  zones: Phaser.GameObjects.Rectangle[];
}

export class Closeup {
  readonly root: Phaser.GameObjects.Container;
  private readonly views: SlotView[] = [];
  private readonly textBox: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly digitBox: Phaser.GameObjects.Text;
  private readonly hoverLabel: Phaser.GameObjects.Text;
  private revealed: Set<number>;
  private dead = false;
  private readonly counters: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private lastRevealed: number[] = [];
  private highlightUntil = 0;
  private closing = false;
  private readonly onKey = (): void => this.requestClose();

  constructor(private readonly scene: Phaser.Scene, private readonly opts: CloseupOptions, originY: number) {
    this.revealed = new Set(opts.revealed);
    const art = stationArt(opts.clueId, opts.observation);
    const assignment = assignFragments(opts.fragments.length, art.slots.length);

    this.root = scene.add.container(0, originY).setDepth(10);
    const shade = scene.add.rectangle(0, 0, CLOSEUP_W, CLOSEUP_H, P.ink, 1).setOrigin(0).setInteractive();
    const border = scene.add.rectangle(0, 0, CLOSEUP_W, CLOSEUP_H).setOrigin(0).setStrokeStyle(3, P.lamp);
    this.root.add([shade, border]);

    const back = scene.add.text(CLOSEUP_W - 12, 10, '< BACK  [Esc]', {
      color: css(P.ink),
      backgroundColor: css(P.lamp),
      fontFamily: FONT,
      fontSize: '13px',
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.pressScale(back, 0.96));
    back.on('pointerout', () => this.pressScale(back, 1));
    back.on('pointerup', () => {
      this.pressScale(back, 1);
      this.requestClose();
    });
    this.root.add(back);
    this.root.add(scene.add.text(14, 12, opts.title.toUpperCase(), { color: css(P.lamp), fontFamily: FONT, fontSize: '16px' }));
    this.status = scene.add.text(14, 34, '', { color: css(P.muted), fontFamily: FONT, fontSize: '11px' });
    this.root.add(this.status);

    // All art sits in a sub-container so it clears the title and status lines.
    const stageBox = scene.add.container(0, STAGE_Y);
    this.root.add(stageBox);
    const stage = scene.add.graphics();
    art.backdrop(stage);
    stageBox.add(stage);
    for (const c of art.captions ?? []) {
      stageBox.add(scene.add.text(c.x, c.y, c.text, {
        color: css(c.color ?? P.muted),
        fontFamily: FONT,
        fontSize: `${c.size ?? 12}px`,
      }).setOrigin(0.5));
    }

    art.slots.forEach((slot, i) => {
      const gfx = scene.add.graphics();
      // Check badge: a drawn tick, so "done" is a shape and not just a colour.
      const tick = scene.add.graphics().setVisible(false);
      tick.fillStyle(P.lamp, 1);
      tick.fillCircle(0, 0, 10);
      tick.lineStyle(3, P.ink, 1);
      tick.beginPath();
      tick.moveTo(-5, 0);
      tick.lineTo(-1, 4);
      tick.lineTo(6, -5);
      tick.strokePath();
      const top = slot.hit.reduce((a, r) => (r.y < a.y ? r : a), slot.hit[0]);
      tick.setPosition(top.x + top.w - 4, top.y - 4);
      stageBox.add([gfx, tick]);
      const view: SlotView = {
        slot,
        gfx,
        fragments: assignment[i],
        progress: 0,
        hover: false,
        pressed: false,
        tick,
        zones: [],
      };
      view.progress = this.slotRevealed(view) ? 1 : 0;
      for (const r of slot.hit) {
        const zone = scene.add.rectangle(r.x, r.y, r.w, r.h, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => this.setHover(view, true));
        zone.on('pointerout', () => {
          this.setHover(view, false);
          view.pressed = false;
          this.redraw(view);
        });
        zone.on('pointerdown', () => {
          view.pressed = true;
          this.redraw(view);
        });
        zone.on('pointerup', () => {
          view.pressed = false;
          this.activate(view);
        });
        view.zones.push(zone);
        stageBox.add(zone);
      }
      this.views.push(view);
      this.redraw(view);
    });

    this.hoverLabel = scene.add.text(0, 0, '', {
      color: css(P.paper),
      backgroundColor: css(P.ink),
      fontFamily: FONT,
      fontSize: '11px',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setVisible(false).setDepth(2);
    stageBox.add(this.hoverLabel);

    this.root.add(scene.add.rectangle(14, 278, CLOSEUP_W - 28, 2, P.muted).setOrigin(0));
    this.textBox = scene.add.text(14, 288, '', {
      color: css(P.paper),
      fontFamily: FONT,
      fontSize: '13px',
      lineSpacing: 4,
      wordWrap: { width: CLOSEUP_W - 28 },
    });
    this.root.add(this.textBox);
    this.digitBox = scene.add.text(14, 284, '', { color: css(P.lamp), fontFamily: FONT, fontSize: '28px', fontStyle: 'bold' }).setVisible(false);
    this.root.add(this.digitBox);
    this.refreshText();

    scene.input.keyboard?.on('keydown-ESC', this.onKey);
    this.zoomIn(originY);
  }

  /** Grow from the clicked prop to fill the room view. Instant when reduced motion is on. */
  private zoomIn(originY: number): void {
    if (reducedMotion()) {
      // Reduced motion: a quick cross-fade, no movement or scale.
      this.root.setAlpha(0);
      this.counters.push(this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 150, ease: 'Sine.easeOut' }));
      return;
    }
    const o = this.opts.origin;
    const k = Math.max(o.h / CLOSEUP_H, 0.2);
    const x0 = o.x - (CLOSEUP_W * k) / 2;
    const y0 = o.y - (CLOSEUP_H * k) / 2;
    this.root.setScale(k).setPosition(x0, y0).setAlpha(0.2);
    this.counters.push(
      this.scene.tweens.add({
        targets: this.root,
        scale: 1,
        x: 0,
        y: originY,
        alpha: 1,
        duration: 250,
        ease: 'Cubic.easeOut',
      }),
    );
  }

  /** Called every frame by the scene so flicker animations (radio) keep moving. */
  tick(): void {
    const now = this.scene.time.now;
    for (const v of this.views) {
      const animated = v.progress > 0 && (v.slot.label === 'Speaker grille' || v.slot.label === 'Power knob');
      if (animated || (v.fragments.length > 0 && !this.slotRevealed(v))) this.redraw(v);
    }
    if (this.highlightUntil !== 0 && now > this.highlightUntil) {
      this.highlightUntil = 0;
      this.lastRevealed = [];
      this.refreshText();
    }
  }

  /** Exits are shorter and smaller than the entrance: a 150 ms fade with a 12 px lift. */
  requestClose(): void {
    if (this.dead || this.closing) return;
    this.closing = true;
    const done = (): void => this.opts.onClose();
    this.counters.push(
      this.scene.tweens.add({
        targets: this.root,
        alpha: 0,
        y: reducedMotion() ? this.root.y : this.root.y - 12,
        duration: 150,
        ease: 'Sine.easeOut',
        onComplete: done,
      }),
    );
  }

  /** Pressed controls shrink to 0.96 over 150 ms (skipped under reduced motion). */
  private pressScale(target: Phaser.GameObjects.Text, scale: number): void {
    if (reducedMotion() || this.dead) return;
    this.scene.tweens.add({ targets: target, scale, duration: 150, ease: 'Sine.easeOut' });
  }

  destroy(): void {
    this.dead = true;
    this.scene.input.keyboard?.off('keydown-ESC', this.onKey);
    for (const t of this.counters) t.stop();
    for (const t of this.timers) t.remove(false);
    this.root.destroy();
  }

  private slotRevealed(v: SlotView): boolean {
    return v.fragments.length > 0 && v.fragments.every((f) => this.revealed.has(f));
  }

  private setHover(v: SlotView, on: boolean): void {
    // A tap leaves :hover latched on touch screens, so hover styling is for mouse pointers only.
    if (on && this.scene.input.activePointer.wasTouch) return;
    v.hover = on;
    this.redraw(v);
    if (on) {
      const first = v.slot.hit[0];
      this.hoverLabel.setText(v.slot.label).setPosition(first.x + first.w / 2, first.y - 6).setVisible(true);
    } else {
      this.hoverLabel.setVisible(false);
    }
  }

  private redraw(v: SlotView): void {
    if (this.dead) return;
    v.gfx.clear();
    v.slot.draw(v.gfx, {
      hint: v.fragments.length > 0 && !this.slotRevealed(v),
      p: v.progress,
      hover: v.hover,
      pressed: v.pressed,
      t: this.scene.time.now,
    });
    v.tick.setVisible(v.fragments.length > 0 && this.slotRevealed(v));
  }

  private activate(v: SlotView): void {
    if (!this.scene.sound.mute) {
      if (v.slot.sound === 'radio') sfx.playRadioStatic(0.35);
      else sfx.playClick(v.slot.sound === 'click' ? 520 : 700, 0.05);
    }
    const fresh = v.fragments.filter((f) => !this.revealed.has(f));
    if (fresh.length > 0) {
      for (const f of fresh) this.revealed.add(f);
      this.lastRevealed = fresh;
      this.highlightUntil = this.scene.time.now + 1400;
      this.opts.onReveal(fresh);
      this.animateTo(v, 1);
    } else if (v.fragments.length > 0) {
      // Already revealed: replay the state change and re-highlight its text.
      this.lastRevealed = v.fragments;
      this.highlightUntil = this.scene.time.now + 1400;
      v.progress = 0;
      this.animateTo(v, 1);
    } else {
      this.lastRevealed = [];
      this.status.setText(v.slot.flavour ?? 'Nothing else of note.');
      this.timers.push(this.scene.time.delayedCall(2200, () => this.refreshText()));
      v.progress = v.progress === 0 ? 1 : v.progress;
      this.redraw(v);
      return;
    }
    this.refreshText();
  }

  private animateTo(v: SlotView, target: number): void {
    if (reducedMotion()) {
      v.progress = target;
      this.redraw(v);
      return;
    }
    const from = v.progress;
    const tween = this.scene.tweens.addCounter({
      from,
      to: target,
      duration: 380,
      onUpdate: (tw) => {
        v.progress = tw.getValue() ?? target;
        this.redraw(v);
      },
      onComplete: () => {
        v.progress = target;
        this.redraw(v);
      },
    });
    this.counters.push(tween);
  }

  private refreshText(): void {
    if (this.dead) return;
    const total = this.opts.fragments.length;
    const got = this.revealed.size;
    const done = got >= total;
    this.status.setText(
      done
        ? 'DONE. Remember this digit for the keypad.'
        : `Tap the glowing parts to look closer.  ${got} of ${total} found.`,
    );
    this.status.setColor(css(done ? P.lamp : P.muted));
    const lines = this.opts.fragments.filter((_, i) => this.revealed.has(i));
    const base = lines.length > 0 ? lines.join(' ') : 'Nothing yet. Tap a glowing part.';
    const known = done ? stationDigit(this.opts.clueId, this.opts.observation) : null;
    this.digitBox.setText(known ? `SEAT ${known.seat}  =  ${known.digit}` : '').setVisible(known !== null);
    this.textBox.setY(known ? 322 : 288);
    this.textBox.setText(base);
    this.textBox.setColor(css(this.lastRevealed.length > 0 ? P.lamp : P.paper));
  }
}
