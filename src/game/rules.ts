/**
 * LAST LIFT: seeded puzzle generator, evaluator and solver proof.
 * Pure TypeScript. No Phaser, no DOM.
 *
 * The six-digit code is generated per seed and kept in a private WeakMap, never on the Puzzle.
 * The source is public, so the seed gives replayability, not secrecy.
 *
 * Structure (seats are code positions 1..6, shuffled per seed into roles a, b, c, e, f, g):
 *   party-table    pins seat a
 *   lobby-display  pins seat b
 *   radio          pins seat f, decoded with the service panel's tone chart
 *   missing-poster gives seat g modulo 5, decoded with the plaque's locker ledger
 *   wall-calendar  picks between the two values the poster leaves (June page; the May page is stale)
 *   ticket-stub    sum of seats c and e
 *   plaque         difference of seats c and e
 *   service-panel  which of c and e is lower (resolves the sum/difference swap)
 * Uniqueness and necessity are proven by brute force (verifyPuzzle), not assumed.
 */
import { CLUE_IDS } from './types';
import type { ClueId, ClueInstance, ProofReport, Puzzle, SubmissionResult } from './types';
import { CLUE_LAYOUT } from '../data/clues';

type Digits = readonly number[];

interface Constraint {
  clueId: ClueId;
  observation: string;
  needs: ClueId[];
  check(d: Digits): boolean;
}

interface Built {
  code: Digits;
  constraints: Constraint[];
}

const SPACE = 1_000_000;
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

const LETTERS = 'ABCDEFGHIJ';
const TONES = ['low', 'middle', 'high'] as const;
const seatNo = (i: number): number => i + 1;
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

function build(seed: string): Built {
  const rng = mulberry32(hashSeed(seed));
  const [a, b, c, e, f, g] = shuffled(rng, [0, 1, 2, 3, 4, 5]);

  const code: number[] = [0, 0, 0, 0, 0, 0];
  for (const seat of [a, b, c, f, g]) code[seat] = int(rng, 0, 9);
  // sum 3..15 leaves two ordered pairs (else the difference clue is redundant); difference below 9
  // (else the sum clue is redundant)
  do code[e] = int(rng, 0, 9);
  while (code[e] === code[c] || code[c] + code[e] < 3 || code[c] + code[e] > 15 || Math.abs(code[c] - code[e]) === 9);

  const [lo, hi] = code[c] < code[e] ? [c, e] : [e, c];
  const sum = code[c] + code[e];
  const diff = Math.abs(code[c] - code[e]);

  // radio tones map to three seats, one of which is f
  const others = shuffled(rng, [a, b, c, e, g]).slice(0, 2);
  const toneIndex = int(rng, 0, 2);
  const toneSeats = [...others];
  toneSeats.splice(toneIndex, 0, f);

  // poster leaves seat g as v or v + 5; the calendar chooses
  const letter = LETTERS[(code[g] % 5) + (rng() < 0.5 ? 0 : 5)];
  const upper = code[g] >= 5;
  // keep the threshold loose enough that the poster is still needed
  const w = upper ? int(rng, code[g] - 5, Math.min(code[g] - 1, 7)) : int(rng, Math.max(code[g] + 1, 2), code[g] + 5);
  let stale = int(rng, 1, 8);
  if (stale === w) stale += 1;
  const dir = upper ? 'over' : 'under';

  const n = code[f];
  const constraints: Constraint[] = [
    {
      clueId: 'party-table',
      needs: [],
      observation:
        `Six place cards stand in a row, numbered 1 to 6, the order the lift reads a code. ` +
        `Seat ${seatNo(a)}'s card shows ${code[a] === 0 ? 'an empty candle holder' : `${plural(code[a], 'candle')} drawn on it`}. ` +
        `The other cards are blank.`,
      check: (d) => d[a] === code[a],
    },
    {
      clueId: 'lobby-display',
      needs: [],
      observation:
        `A display case tagged "Seat ${seatNo(b)}" holds ${plural(code[b] + 1, 'figure')}. ` +
        `One wears a brass staff badge and a tag: "attendant, not part of the display".`,
      check: (d) => d[b] === code[b],
    },
    {
      clueId: 'missing-poster',
      needs: ['plaque'],
      observation:
        `MISSING: Mia, age 9. She sat at place ${seatNo(g)} at the party. ` +
        `Her locker tag is stapled to the corner: ${letter}.`,
      check: (d) => d[g] % 5 === code[g] % 5,
    },
    {
      clueId: 'wall-calendar',
      needs: ['plaque'],
      observation:
        `Two calendar pages are pinned together. The page headed JUNE 1987 has a note on the 21st: ` +
        `"Seat ${seatNo(g)} ${dir} ${w}." The page headed MAY 1986 has a note too: ` +
        `"Seat ${seatNo(g)} ${dir} ${stale}."`,
      check: upper ? (d) => d[g] > w : (d) => d[g] < w,
    },
    {
      clueId: 'radio',
      needs: ['service-panel'],
      observation:
        `The radio repeats ${n === 0 ? 'one long silence' : plural(n, 'short pulse')}, then a ${TONES[toneIndex]} carrier tone, ` +
        `then static.`,
      check: (d) => d[f] === code[f],
    },
    {
      clueId: 'ticket-stub',
      needs: [],
      observation: `ADMIT 21. On the back in pencil: "seats ${seatNo(c)} and ${seatNo(e)}, added together: ${sum}."`,
      check: (d) => d[c] + d[e] === sum,
    },
    {
      clueId: 'plaque',
      needs: [],
      observation:
        `Brass plaque: "Vale's Department Store. Renovated May 1986. Closed after the party of June 1987." ` +
        `Guest record: seats ${seatNo(c)} and ${seatNo(e)} differ by ${diff}. ` +
        `A locker ledger is engraved along the bottom: A is 0, B is 1, C is 2, D is 3, E is 4, then F is 0 again, ` +
        `G is 1, and so on to J.`,
      check: (d) => Math.abs(d[c] - d[e]) === diff,
    },
    {
      clueId: 'service-panel',
      needs: [],
      observation:
        `Service panel. A frequency chart is taped inside the cover: low tone is seat ${seatNo(toneSeats[0])}, ` +
        `middle tone is seat ${seatNo(toneSeats[1])}, high tone is seat ${seatNo(toneSeats[2])}. ` +
        `Two keys are worn smooth, seats ${seatNo(lo)} and ${seatNo(hi)}. Seat ${seatNo(lo)}'s is the more worn, ` +
        `as if its lower digit is always pressed first.`,
      check: (d) => d[lo] < d[hi],
    },
  ];

  return { code, constraints };
}

// ------------------------------------------------------------- solver core

function digitsOf(n: number, out: number[]): void {
  for (let i = 5; i >= 0; i--) {
    out[i] = n % 10;
    n = (n - out[i]) / 10;
  }
}

/** One pass over all 10^6 codes: solutions and, per constraint, solutions when it is removed. */
function analyse(cons: readonly Constraint[]): { solutions: number; without: number[] } {
  const d: number[] = [0, 0, 0, 0, 0, 0];
  const only = new Array<number>(cons.length).fill(0);
  let solutions = 0;
  for (let n = 0; n < SPACE; n++) {
    digitsOf(n, d);
    let fails = 0;
    let failIdx = -1;
    for (let i = 0; i < cons.length; i++) {
      if (!cons[i].check(d)) {
        fails++;
        failIdx = i;
        if (fails > 1) break;
      }
    }
    if (fails === 0) solutions++;
    else if (fails === 1) only[failIdx]++;
  }
  return { solutions, without: only.map((x) => x + solutions) };
}

// ------------------------------------------------------------------- public

export function freshSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function dailySeed(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

const MAX_ATTEMPTS = 50;
const verified = new Map<string, Built>();

/** Retries derived seeds until the puzzle has exactly one solution and every clue is necessary. */
function buildVerified(seed: string): Built {
  const cached = verified.get(seed);
  if (cached) return cached;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = build(attempt === 0 ? seed : `${seed}#${attempt}`);
    const proof = analyse(candidate.constraints);
    if (proof.solutions === 1 && proof.without.every((n) => n > 1)) {
      verified.set(seed, candidate);
      return candidate;
    }
  }
  throw new Error(`No valid puzzle found for seed "${seed}"`);
}

export function createPuzzle(seed: string): Puzzle {
  const result = buildVerified(seed);
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
  const d = /^\d{6}$/.test(attempt) ? [...attempt].map(Number) : null;
  const results = b.constraints
    .filter((c) => found.has(c.clueId))
    .map((c) => ({ clueId: c.clueId, ok: d !== null && c.check(d) }));
  const pass = d !== null && b.constraints.every((c) => c.check(d));
  return { pass, results };
}

export function verifyPuzzle(puzzle: Puzzle): ProofReport {
  const b = built.get(puzzle);
  if (!b) throw new Error('Unknown puzzle');
  const a = analyse(b.constraints);
  const necessity = b.constraints.map((c, i) => ({
    clueId: c.clueId,
    solutionsWithout: a.without[i],
  }));
  return {
    seed: puzzle.seed,
    candidates: SPACE,
    solutions: a.solutions,
    necessity,
    unique: a.solutions === 1,
    allNecessary: necessity.every((n) => n.solutionsWithout > 1),
  };
}
