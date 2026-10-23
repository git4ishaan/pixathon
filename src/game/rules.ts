/**
 * LAST LIFT: seeded puzzle generator, evaluator and verifier.
 * Pure TypeScript. No Phaser, no DOM.
 *
 * The eight-digit code is generated per seed and kept in a private WeakMap, never on the Puzzle.
 * The source is public, so the seed gives replayability, not secrecy.
 *
 * Every clue is independent: each of the eight props names one seat (code position 1..8) and the
 * digit in it, in plain words. No sums, differences, comparisons or "needs another clue". The seat
 * a prop talks about is shuffled per seed, so the order of digits is not the order of the props.
 * Uniqueness and necessity are measured by verifyPuzzle, not assumed.
 */
import { CLUE_IDS } from './types';
import type { ClueId, ClueInstance, ProofReport, Puzzle, SubmissionResult } from './types';
import { CLUE_LAYOUT } from '../data/clues';

export const CODE_LENGTH = 8;

type Digits = readonly number[];

interface Constraint {
  clueId: ClueId;
  /** Zero-based code position this clue is about. */
  seat: number;
  observation: string;
  needs: ClueId[];
  check(d: Digits): boolean;
}

interface Built {
  code: Digits;
  constraints: Constraint[];
}

const built = new WeakMap<Puzzle, Built>();

// ---------------------------------------------------------------- random

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));

function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------- generator

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Plain wording per clue: seat s (1-based) holds digit k. */
const WORDING: Readonly<Record<ClueId, (s: number, k: number) => string>> = {
  'party-table': (s, k) =>
    `Eight place cards stand in a row, numbered 1 to 8, the order the lift reads a code. ` +
    `Seat ${s}'s card shows ${k === 0 ? 'an empty candle holder' : `${plural(k, 'candle')} drawn on it`}. ` +
    `The other cards are blank.`,
  'lobby-display': (s, k) =>
    `A display case is tagged "Seat ${s}". ` +
    `A bellhop figure with a brass badge stands at the back. ` +
    `It holds ${plural(k, 'guest figure')} besides him.`,
  'missing-poster': (s, k) =>
    `MISSING: Mia. She sat at place ${s} at the party. ` +
    `Her locker number is stapled to the corner: ${k}.`,
  'wall-calendar': (s, k) =>
    `Two calendar pages are pinned together. The page headed JUNE 1987 has a note on the 21st: ` +
    `"Seat ${s} is ${k}." The page headed MAY 1986 is crossed out.`,
  radio: (s, k) =>
    `The radio repeats ${k === 0 ? 'one long silence' : plural(k, 'short pulse')}. ` +
    `A strip of tape on the dial reads: "Seat ${s}". Then static.`,
  'ticket-stub': (s, k) => `ADMIT 21. On the back in pencil: "Seat ${s} is ${k}."`,
  plaque: (s, k) =>
    `Brass plaque: "Vale's Department Store. Closed after the party of June 1987." ` +
    `Guest record: Seat ${s} came with ${plural(k, 'guest')}. ` +
    `A locker ledger is engraved along the bottom, one line for each seat.`,
  'service-panel': (s, k) =>
    `Service panel. A chart taped inside the cover reads: "Seat ${s} is ${k}." ` +
    `Several keys are worn smooth. The panel hums faintly.`,
};

function build(seed: string): Built {
  const rng = mulberry32(hashSeed(seed));
  const seats = shuffled(rng, Array.from({ length: CODE_LENGTH }, (_, i) => i));
  const code = Array.from({ length: CODE_LENGTH }, () => int(rng, 0, 9));
  const constraints: Constraint[] = CLUE_IDS.map((clueId, i) => {
    const seat = seats[i];
    const digit = code[seat];
    return {
      clueId,
      seat,
      observation: WORDING[clueId](seat + 1, digit),
      needs: [],
      check: (d) => d[seat] === digit,
    };
  });
  return { code, constraints };
}

// ------------------------------------------------------------------- public

export function freshSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function dailySeed(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function createPuzzle(seed: string): Puzzle {
  const result = build(seed);
  const byId = new Map(result.constraints.map((c) => [c.clueId, c]));
  const clues: ClueInstance[] = CLUE_LAYOUT.map((layout) => {
    const c = byId.get(layout.id);
    if (!c) throw new Error(`Missing constraint for clue ${layout.id}`);
    return {
      id: layout.id,
      label: layout.label,
      observation: c.observation,
      needs: c.needs,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      pulse: layout.pulse,
    };
  });
  if (clues.length !== CLUE_IDS.length) throw new Error('Clue layout is incomplete');

  const puzzle: Puzzle = { seed, clues };
  built.set(puzzle, result);
  return puzzle;
}

export function submitCode(
  puzzle: Puzzle,
  attempt: string,
  found: ReadonlySet<ClueId>,
): SubmissionResult {
  const b = built.get(puzzle);
  if (!b) throw new Error('Unknown puzzle');
  const d = new RegExp(`^\\d{${CODE_LENGTH}}$`).test(attempt) ? [...attempt].map(Number) : null;
  const results = b.constraints
    .filter((c) => found.has(c.clueId))
    .map((c) => ({ clueId: c.clueId, ok: d !== null && c.check(d) }));
  const pass = d !== null && b.constraints.every((c) => c.check(d));
  return { pass, results };
}

/**
 * Measures, never assumes. For every clue it tries all ten digits at its seat against three
 * different fillings of the other seats (the result must not change: the clue really is
 * independent). Then per seat it counts the digits that satisfy every clue about that seat, and the
 * number of full codes is the product of those counts (seats are independent). Removing a clue
 * frees its seat back to ten digits. Nothing here walks all 10^8 codes.
 */
export function verifyPuzzle(puzzle: Puzzle): ProofReport {
  const b = built.get(puzzle);
  if (!b) throw new Error('Unknown puzzle');

  const fills = [0, 5, 9];
  let checks = 0;
  let independent = true;
  const passing: boolean[][] = b.constraints.map((c) =>
    Array.from({ length: 10 }, (_, digit) => {
      const outcomes = fills.map((fill) => {
        const d = new Array<number>(CODE_LENGTH).fill(fill);
        d[c.seat] = digit;
        checks++;
        return c.check(d);
      });
      if (new Set(outcomes).size !== 1) independent = false;
      return outcomes[0];
    }),
  );

  const perSeat = Array.from({ length: CODE_LENGTH }, (_, seat) => {
    let count = 10;
    b.constraints.forEach((c, i) => {
      if (c.seat === seat) count = Math.min(count, passing[i].filter(Boolean).length);
    });
    return count;
  });
  const everySeatCovered = new Set(b.constraints.map((c) => c.seat)).size === CODE_LENGTH;
  const product = (counts: number[]): number => counts.reduce((a, n) => a * n, 1);

  const solutions = independent && everySeatCovered ? product(perSeat) : 0;
  const necessity = b.constraints.map((c) => {
    const others = perSeat.slice();
    const sameSeat = b.constraints.some((o) => o !== c && o.seat === c.seat);
    if (!sameSeat) others[c.seat] = 10;
    return { clueId: c.clueId, solutionsWithout: product(others) };
  });

  return {
    seed: puzzle.seed,
    candidates: 10 ** CODE_LENGTH,
    checks,
    solutions,
    necessity,
    unique: solutions === 1,
    allNecessary: necessity.every((n) => n.solutionsWithout > 1),
  };
}

/**
 * The seat and digit a station spells out once its whole clue has been read. Parsed from the clue
 * text the player has already seen, so it reveals nothing new.
 */
export function stationDigit(clueId: ClueId, observation: string): { seat: number; digit: number } | null {
  const find = (re: RegExp, pick: (m: RegExpExecArray) => [number, number]): { seat: number; digit: number } | null => {
    const m = re.exec(observation);
    if (!m) return null;
    const [seat, digit] = pick(m);
    return { seat, digit };
  };
  switch (clueId) {
    case 'party-table':
      return find(/Seat (\d)'s card shows (?:an empty candle holder|(\d+) candles?)/, (m) => [Number(m[1]), m[2] === undefined ? 0 : Number(m[2])]);
    case 'lobby-display':
      return find(/Seat (\d)"[\s\S]*It holds (\d+) guest figures?/, (m) => [Number(m[1]), Number(m[2])]);
    case 'missing-poster':
      return find(/place (\d)[\s\S]*corner: (\d)\./, (m) => [Number(m[1]), Number(m[2])]);
    case 'radio':
      return find(/repeats (?:one long silence|(\d+) short pulses?)[\s\S]*"Seat (\d)"/, (m) => [Number(m[2]), m[1] === undefined ? 0 : Number(m[1])]);
    case 'plaque':
      return find(/Seat (\d) came with (\d+) guests?/, (m) => [Number(m[1]), Number(m[2])]);
    case 'wall-calendar':
    case 'ticket-stub':
    case 'service-panel':
      return find(/"Seat (\d) is (\d)\."/, (m) => [Number(m[1]), Number(m[2])]);
  }
}
