/**
 * LAST LIFT: Chime's patrol. Pure logic, no Phaser or DOM imports.
 * Route: office -> corridor -> lift-lobby -> caught.
 */
import type { ChimeApi, ChimeState, ClueId, PatrolPoint } from './types';

const ROUTE: readonly PatrolPoint[] = ['office', 'corridor', 'lift-lobby'];

/** Which patrol point's area each clue sits in. The party table is never locked. */
const CLUE_AREA: Readonly<Record<ClueId, PatrolPoint | null>> = {
  'party-table': null,
  'missing-poster': 'office',
  'wall-calendar': 'office',
  radio: 'corridor',
  plaque: 'corridor',
  'ticket-stub': 'corridor',
  'lobby-display': 'lift-lobby',
  'service-panel': 'lift-lobby',
};

/** Timer moves fire at these elapsed times. Nothing happens in the first 30 seconds. */
export const TIMER_STEPS_MS: readonly number[] = [60_000, 105_000, 150_000];

export function initChime(): ChimeState {
  return { point: ROUTE[0], step: 0, caught: false };
}

export function advanceChime(state: ChimeState, _reason: 'timer' | 'wrong-code'): ChimeState {
  if (state.caught) return state;
  const nextStep = state.step + 1;
  if (nextStep >= ROUTE.length) {
    return { point: ROUTE[ROUTE.length - 1], step: nextStep, caught: true };
  }
  return { point: ROUTE[nextStep], step: nextStep, caught: false };
}

export function isClueLocked(state: ChimeState, clueId: ClueId): boolean {
  if (state.caught) return false;
  return CLUE_AREA[clueId] === state.point;
}

export const chime: ChimeApi = { initChime, advanceChime, isClueLocked, TIMER_STEPS_MS };
