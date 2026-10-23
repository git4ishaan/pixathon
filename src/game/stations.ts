/**
 * LAST LIFT: station progress (pure, no Phaser or DOM).
 * Each clue is a station with a few sub-props. Tapping a sub-prop reveals the fragments
 * assigned to it. A station is complete once every fragment is revealed. This never reads
 * or exposes the passcode, and never changes what rules.ts sees.
 */
import type { ClueId, Puzzle } from './types';

/** Split an observation into sentences, never splitting inside "quoted text". */
export function splitFragments(observation: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < observation.length; i++) {
    const ch = observation[i];
    current += ch;
    if (ch === '"') inQuote = !inQuote;
    const terminal = (c: string | undefined): boolean => c === '.' || c === '!' || c === '?';
    // A sentence ends at a full stop outside quotes, or at a closing quote that follows one.
    const endsSentence = !inQuote && (terminal(ch) || (ch === '"' && terminal(observation[i - 1])));
    if (!endsSentence) continue;
    const next = observation[i + 1];
    // A closing quote right after the full stop belongs to this sentence.
    if (next === '"') continue;
    if (next === undefined || next === ' ' || next === '\n') {
      out.push(current.trim());
      current = '';
    }
  }
  if (current.trim() !== '') out.push(current.trim());

  // One long sentence of "..., then ..., then ..." (the radio) becomes one fragment per step.
  if (out.length === 1 && out[0].includes(', then ')) {
    const parts = out[0].replace(/\.$/, '').split(', then ');
    return parts.map((p, i) => (i === 0 ? `${p}.` : `Then ${p}.`));
  }
  return out;
}

/**
 * Spread `total` fragments over `slots` sub-props in order. Every fragment goes to exactly one
 * slot; slots beyond the fragment count get none (they are flavour only).
 */
export function assignFragments(total: number, slots: number): number[][] {
  const result: number[][] = Array.from({ length: slots }, () => []);
  if (slots === 0) return result;
  for (let i = 0; i < total; i++) result[Math.min(i, slots - 1)].push(i);
  return result;
}

export interface StationState {
  readonly total: number;
  readonly revealed: ReadonlySet<number>;
}

export type StationsState = ReadonlyMap<ClueId, StationState>;

export function initStations(puzzle: Puzzle): StationsState {
  return new Map(
    puzzle.clues.map((c): [ClueId, StationState] => [
      c.id,
      { total: splitFragments(c.observation).length, revealed: new Set<number>() },
    ]),
  );
}

export function revealFragments(state: StationsState, clueId: ClueId, indices: readonly number[]): StationsState {
  const station = state.get(clueId);
  if (!station) return state;
  const revealed = new Set(station.revealed);
  for (const i of indices) if (i >= 0 && i < station.total) revealed.add(i);
  if (revealed.size === station.revealed.size) return state;
  const next = new Map(state);
  next.set(clueId, { total: station.total, revealed });
  return next;
}

export function isComplete(state: StationsState, clueId: ClueId): boolean {
  const station = state.get(clueId);
  return station !== undefined && station.total > 0 && station.revealed.size === station.total;
}

export function hasProgress(state: StationsState, clueId: ClueId): boolean {
  return (state.get(clueId)?.revealed.size ?? 0) > 0;
}

/** Revealed fragments in original order. */
export function revealedText(state: StationsState, clueId: ClueId, fragments: readonly string[]): string[] {
  const station = state.get(clueId);
  if (!station) return [];
  return fragments.filter((_, i) => station.revealed.has(i));
}

export function completedIds(state: StationsState): ReadonlySet<ClueId> {
  const ids = new Set<ClueId>();
  for (const id of state.keys()) if (isComplete(state, id)) ids.add(id);
  return ids;
}
