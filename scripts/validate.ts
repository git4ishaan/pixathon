/**
 * scripts/validate.ts
 *
 * For each seed: measure that every clue depends only on its own seat, count the codes that satisfy
 * every clue (must be exactly one of 10^8), and prove each clue is necessary (removing it leaves
 * more than one code). Prints measured results and never prints a code.
 *
 * Run: bun run validate            (regression seeds + a sweep)
 *      bun run validate -- --sweep 200
 */
import { CLUE_LAYOUT } from '../src/data/clues';
import { createPuzzle, dailySeed, verifyPuzzle } from '../src/game/rules';

const REGRESSION_SEEDS = ['LASTLIFT', 'MIA-1987', 'VALE', 'CHIME', 'JUNE21', 'ADMIT21', dailySeed()];

const sweepArg = process.argv.indexOf('--sweep');
const sweep = sweepArg >= 0 ? Number(process.argv[sweepArg + 1]) : 24;
const seeds = [...REGRESSION_SEEDS, ...Array.from({ length: sweep }, (_, i) => `SWEEP-${i}`)];

let failures = 0;

if (CLUE_LAYOUT.filter((c) => c.pulse).length !== 1) {
  console.error('FAIL: exactly one clue must have pulse: true.');
  failures++;
}

for (const seed of seeds) {
  const t0 = Date.now();
  try {
    const puzzle = createPuzzle(seed);
    const r = verifyPuzzle(puzzle);
    const minWithout = Math.min(...r.necessity.map((n) => n.solutionsWithout));
    const ok = r.unique && r.allNecessary;
    if (!ok) failures++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} seed=${seed} candidates=${r.candidates} checks=${r.checks} solutions=${r.solutions} ` +
        `minSolutionsWithOneRuleRemoved=${minWithout} (${Date.now() - t0}ms)`,
    );
  } catch (e) {
    failures++;
    console.log(`FAIL seed=${seed} ${(e as Error).message}`);
  }
}

if (failures > 0) {
  console.error(`FAIL: ${failures} problem(s) across ${seeds.length} seeds.`);
  process.exit(1);
}
console.log(`PASS: ${seeds.length} seeds each have exactly one valid code and every rule is necessary.`);
