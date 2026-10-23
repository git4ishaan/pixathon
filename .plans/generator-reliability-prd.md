# PRD: Seeded generator reliability (taking over from Mitansh)

Owner: Aarush (took over Mitansh's `src/game/rules.ts`, `src/data/clues.ts`, `scripts/validate.ts`). Date: 2026-10-23.

## Status check (measured, not assumed)

- Mitansh's `mitansh` branch and `origin/main` hold the OLD engine: eight fixed rules over one hard-coded code. It violates AGENTS.md ("never hard-code a static solution"). Nothing newer from Mitansh exists on any remote branch.
- The seeded engine (private WeakMap code, 8 clue generators, brute-force proof) exists only as **uncommitted edits** in this working tree. Its author is not recorded; treat it as unreviewed.
- After merging `origin/main` (f01e3cc) into `room-loop`: `bun run typecheck` passes, `bun run build` passes, `bun run validate` **fails**.
- Validate result: 31 seeds checked, **15 fail** with `No valid puzzle found`. Failing regression seeds: `CHIME`, `ADMIT21`. Failing sweep seeds: SWEEP-0, 4, 5, 7, 11, 12, 20, 21, 22, 23. Passing seeds all report `solutions=1` and `minSolutionsWithOneRuleRemoved` of 2 or 3, taking 1.4-10 s each.
- Consequence: `createPuzzle` throws on roughly half of seeds, so the game would crash on start for those seeds (`freshSeed()` and `dailySeed()` feed it directly). This is the release blocker.

## Goals

1. `createPuzzle(seed)` succeeds for every seed (or deterministically falls back), in under 2 s on a mid phone.
2. Every produced puzzle has exactly 1 solution and every constraint is necessary (removing it gives more than 1 solution).
3. `bun run validate` checks the fixed seeds plus a sweep, prints seeds checked and measured counts, and exits 0.
4. Add per-station data for the zoom redesign (see `room-zoom-stations-spec.md`) without weakening 1-3.

## Non-goals

No new clue types now. No UI work. No change to the public API in `src/game/types.ts` except additive optional fields.

## Root-cause hypotheses (verify before fixing)

`tryBuild` picks, per clue in a random order, the candidate whose surviving-count is closest to a target schedule, then requires exactly one survivor after step 8 and every constraint necessary. Likely failures:
- The last steps cannot reach count 1 because their generators constrain at most one or two seats (ticket-stub, plaque, calendar), and `needs`/`toneSeats` couple clues.
- The necessity check (`without >= 2`) rejects builds where a late clue is the only one fixing a seat.
- `MAX_ATTEMPTS = 60` runs out, because each attempt costs about 100 ms-1 s of enumeration.

Instrument: for each failing seed log, per attempt, the step where it died (count never reached 1, empty candidate set, or necessity violation). Do not guess; the histogram decides the fix.

## Requirements

### R1 Instrumentation (first)
Add a `diagnose(seed)` function used only by `scripts/` that returns per-attempt failure reasons. Print a histogram for the 15 failing seeds. No effect on the shipped bundle's behaviour.

### R2 Generation strategy
Choose after R1. Acceptable fixes, in order of preference:
1. Order-aware construction: place the clues that fix whole seats (exact variants) so every seat is covered by at least one clue before relational ones, then use relational clues to shrink the remaining space.
2. Raise attempts with a cheaper pre-filter (sampled counts) so more attempts fit the time budget.
3. Constructive fallback: if all attempts fail, derive the next sub-seed deterministically (`${seed}#1`, `#2`, ...) and report the sub-seed index. Same seed must still give the same puzzle. Cap at a documented number; throw only if the cap is hit.

No static solution table. No retry loops that call `Math.random()`.

### R3 Performance
Measure time for `createPuzzle` across the sweep. Target: p95 under 2 s on the dev machine, and no main-thread freeze over 300 ms on a phone; if the target cannot be met, generate on the title screen while the loading state shows, or in a Worker. Print measured times; do not state unmeasured numbers.

### R4 Validator
- Keep the regression seeds; add the seeds that failed (`CHIME`, `ADMIT21`) as permanent regressions.
- Sweep size from env var, default at least 24, printed.
- Output must include: seeds checked, candidates, solutions, minimum solutions with one rule removed, and failure count. Exit nonzero on any failure.
- Do not print the code or any digit.

### R5 Station data (additive, after R1-R4 pass)
- Optional `fragments?: { subProp: string; text: string }[]` on `ClueInstance`; `observation` stays and equals the fragments joined.
- Export a gated fact descriptor for station UI: kind (`exact` | `relation`), seat indices, and the digit only for `exact` facts, available only for clues in the `found` set. Agree the signature with Aarush before coding.
- Validator asserts descriptor facts are true for the solution (checked internally, not printed).

## Acceptance

- `bun run typecheck`, `bun run validate`, `bun run build` all pass on a clean checkout.
- Validate output shows 0 failures over at least the 7 regression seeds plus 24 sweep seeds, with measured numbers.
- Two runs with the same seed produce byte-identical clue text.
- No console errors starting a round with 20 random `freshSeed()` values.

## Risks

- Tightening generation can reduce clue variety. Check that the variant mix per clue (exact vs relational) still varies across seeds and report the measured distribution.
- Uncommitted edits in the tree are the only copy; commit them to a branch (`aarush/generator`) before changing anything.

## Order of work

1. Commit the current working-tree engine on `aarush/generator` (explicit paths only).
2. R1 histogram. 3. R2 fix. 4. R4 validator. 5. R3 timing. 6. R5.
7. Append to `AI_LOG.md`; ask Mitansh to review before merging to `main`.

---

## Update 2026-10-23 (later): premise changed

While this PRD was being written, another agent committed the constructive generator (`70ae11d` "Replace fixed rules with seeded generator and solver proof"). After merging `qa-room-loop` on top (`c06c733`), `bun run typecheck`, `bun run build` and `bun run validate` all pass: 31 of 31 seeds report ok, 0 FAIL. The "15 of 31 fail" figures above describe the earlier uncommitted tree and are stale.

Remaining from this PRD: R3 (timing; measure createPuzzle across a bigger sweep) and R5 (fragments and fact descriptor for stations). R1/R2 are only needed if a sweep fails again.
