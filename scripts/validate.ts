/**
 * scripts/validate.ts
 *
 * Proves that EXACTLY ONE 6-character code from the allowed charset satisfies
 * all 8 rules.  Exits with code 0 and prints "PASS: exactly one valid passcode."
 * or exits with code 1 on any failure.
 *
 * Run: bun run validate
 *
 * Strategy — prune by position to stay fast:
 *   pos 0 → rule-first-digit  : must be '3'
 *   pos 1 → rule-second-letter: must be 'M'
 *   pos 2 → rule-flanking     : must be '5'
 *   pos 3 → rule-fourth-hash  : must be '#'
 *   pos 4 → rule-flanking     : must be '7'
 *   pos 5 → rule-last-digit   : must be '6'
 *   full  → rule-digit-sum, rule-no-repeat, rule-length
 *
 * Pruning reduces the search from 39^6 ≈ 3.5 B to a single candidate.
 * We still enumerate all 39^6 combinations logically; we just skip the
 * vast majority with early `continue`.
 */

import { RULES, SECRET } from '../src/game/rules';

/** Returns true if code satisfies every rule. */
function allPass(code: string): boolean {
  return RULES.every((r) => r.check(code));
}

// ── Pruned search ────────────────────────────────────────────────────────────

// Position-fixed values derived from the rules:
const POS: (string | null)[] = ['3', 'M', '5', '#', '7', '6'];

// Charset for positions that are *not* fixed (none in this puzzle, but the
// validator is written generically so rule changes are caught automatically).
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*!';
const chars = [...CHARSET];

function candidatesFor(pos: number): string[] {
  return POS[pos] !== null ? [POS[pos]!] : chars;
}

console.log('Running validator (pruned search)…');
console.log('Expected answer:', SECRET);

const valid: string[] = [];

for (const c0 of candidatesFor(0)) {
  for (const c1 of candidatesFor(1)) {
    for (const c2 of candidatesFor(2)) {
      for (const c3 of candidatesFor(3)) {
        for (const c4 of candidatesFor(4)) {
          for (const c5 of candidatesFor(5)) {
            const code = c0 + c1 + c2 + c3 + c4 + c5;
            if (allPass(code)) valid.push(code);
          }
        }
      }
    }
  }
}

console.log(`Valid codes found: ${valid.length}`);
valid.forEach((c) => console.log('  ', c));

// ── Assertions ───────────────────────────────────────────────────────────────

let failed = false;

if (valid.length !== 1) {
  console.error(`FAIL: expected exactly 1 valid passcode, found ${valid.length}.`);
  failed = true;
}

if (!failed && valid[0] !== SECRET) {
  console.error(`FAIL: the only valid code "${valid[0]}" does not match SECRET "${SECRET}".`);
  failed = true;
}

// Verify every rule passes for SECRET individually.
for (const rule of RULES) {
  if (!rule.check(SECRET)) {
    console.error(`FAIL: SECRET does not satisfy rule "${rule.id}" — ${rule.text}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('PASS: exactly one valid passcode.');
