// Headless check for src/game/stations.ts. Run: npx tsx scripts/stations.check.ts
import { createPuzzle } from '../src/game/rules';
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
console.log(`stations.check: ${SEEDS.length} seeds, ${stationsChecked} stations, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
