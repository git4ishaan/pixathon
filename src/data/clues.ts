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

const W = 150;
const H = 165;

export const CLUE_LAYOUT: readonly ClueLayout[] = [
  { id: 'party-table', label: 'Party Table', x: 183, y: 333, width: W, height: H, pulse: true },
  { id: 'lobby-display', label: 'Lobby Display', x: 642, y: 319, width: W, height: H },
  { id: 'missing-poster', label: 'Missing Poster', x: 141, y: 134, width: W, height: H },
  { id: 'wall-calendar', label: 'Wall Calendar', x: 352, y: 134, width: W, height: H },
  { id: 'radio', label: 'Radio', x: 564, y: 134, width: W, height: H },
  { id: 'ticket-stub', label: 'Ticket Stub', x: 409, y: 348, width: W, height: H },
  { id: 'plaque', label: 'Store Plaque', x: 776, y: 134, width: W, height: H },
  { id: 'service-panel', label: 'Service Panel', x: 863, y: 285, width: W, height: H },
];
