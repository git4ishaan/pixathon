/**
 * LAST LIFT: static room layout for the eight clue objects.
 * Observation text is generated per seed in src/game/rules.ts.
 * Coordinates are hotspot centres in the 960x540 canvas (see ROOM_BLOCKOUT.md).
 */
import type { ClueId } from '../game/types';

export interface ClueLayout {
  id: ClueId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The first object a new player should inspect. Exactly one entry sets this. */
  pulse?: boolean;
}

const W = 120;
const H = 132;

export const CLUE_LAYOUT: readonly ClueLayout[] = [
  { id: 'party-table', label: 'Party Table', x: 130, y: 365, width: W, height: H, pulse: true },
  { id: 'lobby-display', label: 'Lobby Display', x: 455, y: 350, width: W, height: H },
  { id: 'missing-poster', label: 'Missing Poster', x: 100, y: 160, width: W, height: H },
  { id: 'wall-calendar', label: 'Wall Calendar', x: 250, y: 160, width: W, height: H },
  { id: 'radio', label: 'Radio', x: 400, y: 160, width: W, height: H },
  { id: 'ticket-stub', label: 'Ticket Stub', x: 290, y: 380, width: W, height: H },
  { id: 'plaque', label: 'Store Plaque', x: 550, y: 160, width: W, height: H },
  { id: 'service-panel', label: 'Service Panel', x: 612, y: 315, width: W, height: H },
];
