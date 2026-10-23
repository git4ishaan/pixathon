// Headless check for src/game/stations.ts. Run: npx tsx scripts/stations.check.ts
import { CODE_LENGTH, createPuzzle, stationDigit, submitCode } from '../src/game/rules';
import type { ClueId } from '../src/game/types';
import { assignFragments, completedIds, initStations, isComplete, revealFragments, splitFragments } from '../src/game/stations';

const SEEDS = ['LASTLIFT', 'MIA-1987', 'VALE', 'JUNE21'];
let failures = 0;
const check = (ok: boolean, msg: string): void => {
  if (!ok) {
    failures++;
    console.log('FAIL', msg);
  }
};

let stationsChecked = 0;
for (const seed of SEEDS) {
  const puzzle = createPuzzle(seed);
  let state = initStations(puzzle);
  check(completedIds(state).size === 0, `${seed}: nothing complete at start`);
  for (const clue of puzzle.clues) {
    const frags = splitFragments(clue.observation);
    stationsChecked++;
    check(frags.length >= 1, `${seed}/${clue.id}: has fragments`);
    check(
      frags.join(' ').replace(/\s+/g, ' ').replace(/Then t/g, 'then ').length > 0,
      `${seed}/${clue.id}: non-empty`,
    );
    for (let slots = 1; slots <= 5; slots++) {
      const flat = assignFragments(frags.length, slots).flat().sort((a, b) => a - b);
      check(flat.length === frags.length && flat.every((v, i) => v === i), `${seed}/${clue.id}: ${slots} slots cover each fragment once`);
    }
    // Revealing out of order, with repeats, still completes exactly when all are revealed.
    const order = frags.map((_, i) => i).reverse();
    for (let k = 0; k < order.length; k++) {
      check(!isComplete(state, clue.id), `${seed}/${clue.id}: incomplete before last reveal`);
      state = revealFragments(state, clue.id, [order[k], order[k]]);
    }
    check(isComplete(state, clue.id), `${seed}/${clue.id}: complete after all reveals`);
  }
  check(completedIds(state).size === puzzle.clues.length, `${seed}: all stations complete`);
}
// Each clue names one seat and one digit, and together they spell the real code (no sums or relations).
for (const seed of SEEDS) {
  const puzzle = createPuzzle(seed);
  const all = new Set<ClueId>(puzzle.clues.map((c) => c.id));
  const digits = new Array<number>(CODE_LENGTH).fill(0);
  for (let pos = 0; pos < CODE_LENGTH; pos++) {
    let best = 0;
    let bestOk = -1;
    for (let d = 0; d <= 9; d++) {
      const trial = digits.slice();
      trial[pos] = d;
      const ok = submitCode(puzzle, trial.join(''), all).results.filter((r) => r.ok).length;
      if (ok > bestOk) [best, bestOk] = [d, ok];
    }
    digits[pos] = best;
  }
  check(submitCode(puzzle, digits.join(''), all).pass, `${seed}: per-position solve passes`);
  const seats = new Set<number>();
  for (const clue of puzzle.clues) {
    const known = stationDigit(clue.id, clue.observation);
    check(known !== null, `${seed}/${clue.id}: names a seat and digit`);
    if (known) {
      seats.add(known.seat);
      check(digits[known.seat - 1] === known.digit, `${seed}/${clue.id}: stated digit matches the code`);
    }
    check(clue.needs.length === 0, `${seed}/${clue.id}: needs no other clue`);
  }
  check(seats.size === CODE_LENGTH, `${seed}: eight clues cover eight different seats`);
}
console.log(`stations.check: ${SEEDS.length} seeds, ${stationsChecked} stations, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
