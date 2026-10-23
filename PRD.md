# LAST LIFT — PRD

**Pixathon problem statement 2: Puzzle Passwords.**

**Goal line:** Find the evidence, solve the lift code, and get out before Chime reaches you.

## 0. Product decisions

- One polished, replayable lift puzzle ships before any multi-level campaign or lore minigame.
- The code is eight digits (one per clue) and is generated from a puzzle seed. Each clue names one seat and its digit independently: no sums, comparisons or clue-to-clue dependencies (decision, 2026-10-23). It is a fictional game code, never a real credential.
- Players solve from observations found in the room. The UI does not state the constraint or answer when a clue is found.
- The setting is a closed department store and its service elevator. The art uses clockwork, brass, paper records, and empty retail spaces; avoid the visual language of an arcade mascot horror game.
- AI use is visible through a truthful solver-proof panel backed by `bun run validate`; no live model or API key ships in the game.

## 1. Technology

- TypeScript strict, Phaser 3.90, Vite 7, Bun.
- Commands: `bun install`, `bun run dev`, `bun run typecheck`, `bun run validate`, `bun run build`.
- Pure puzzle generation and evaluation live in `src/game/rules.ts`. Clue observations and room positions live in `src/data/clues.ts`. The brute-force verifier lives in `scripts/validate.ts`.
- GitHub Pages deploys from `main`. Publish and verify the Vite shell before gameplay work depends on the live URL.

## 2. Setting and characters

Vale's Department Store, Sunnyday Plaza, closed in June 1987. The player is the night custodian's child, returning to learn what happened to their older sister Mia after a private birthday gathering in the store. Six children vanished; the story is told through empty place settings, dated paperwork, and a lift that still runs after closing.

- **Chime** is a clockwork lift attendant: a brass wind-up mechanism in an old bellhop uniform, with a floor indicator and service bell. No animal head or mascot suit.
- **Biscuit** is a silent pastry-counter display figure. **Pip** is a tin shop-announcement bird. Keep them as distinct store automatons, not a performing mascot cast.
- The children are never shown being harmed. No gore or on-screen death.

## 3. Core round

1. Title screen shows the game name, goal line, “Contains a jumpscare,” and mute control.
2. The player enters one department-store lift lobby with eight clickable clue objects. The first clue pulses.
3. Found clues add raw observations to an evidence log. Some evidence needs another clue to interpret.
4. The player enters an eight-digit code using a custom on-screen numeric keypad: digits 0–9, delete, clear, and submit. Do not rely on browser or Phaser text input.
5. After a complete submission, show pass/fail feedback for discovered clues. Do not reveal constraint status on each keypress.
6. A wrong submission costs 10 seconds and advances Chime one patrol step. When Chime occupies an object's area, that clue is temporarily unavailable; players choose another clue or wait for an opening.
7. The timer is three minutes. Chime starts away from the lift and makes no timer-driven move during the first 30 seconds. Later moves are visible and tied to fixed patrol points.
8. Correct code opens the lift. Time-out or being caught triggers a brief, warned jumpscare and an ending panel. Restart starts a fresh seed without reloading.

There is no hiding mechanic in Tier 1. Add it only if playtests show the core loop needs another decision.

## 4. Clue and deduction design

Eight objects provide eight necessary constraints. Their UI text describes what the player observes, never “position N is digit X.” A clue may be added to the evidence log before it can be interpreted.

| Object | Observation role | Link to other evidence |
|---|---|---|
| Party table | Eight numbered place settings establish the code's structure | Introduces the event's numbering scheme |
| Lobby display | Three stationary figures have display markers; Chime has a staff badge | Removes ambiguity about which figures are counted |
| Missing poster | Mia's record contains a date and an identifier | The identifier is interpreted using the store's own index clue |
| Wall calendar | Current June 1987 calendar beside a stale May 1986 copy | The store plaque/date identifies the stale page as a red herring |
| Radio | A short pulse pattern and carrier tone | The lift service plate supplies the frequency key |
| Ticket stub | “ADMIT 21” with a smudged date on the reverse | The calendar reveals which date field to use |
| Store plaque | Renovation/guest-record facts and a dated inscription | Resolves the calendar red herring and provides an index key |
| Elevator service panel | Worn numeric buttons and a service frequency chart | Orders the panel digits and decodes the radio observation |

Mitansh must produce a worked seed before implementation is called complete. For that seed, demonstrate that all eight observations are understandable, the red herring has a fair resolution, and each corresponding constraint is necessary. Do not ship ambiguous “three beats means a symbol” leaps.

The validator must, for every fixed regression seed:

1. Measure that every clue depends on one seat only, then count the codes (of 10^8) that satisfy all clues: exactly one.
2. Remove each constraint in turn and prove that more than one candidate then satisfies the remaining constraints.
3. Report the seeds checked, candidate counts, unique-solution result, and necessity result. UI proof text must come from these measured results, never a hard-coded claim.

The game source is public, so seeded generation is for replayability, not security. Never claim it protects a real secret. Do not put a fixed answer in this document, UI, or logs.

## 5. Puzzle generation and AI proof

- Each fresh run receives a generated seed; offer a UTC daily seed for repeatable shared challenges.
- Generation uses a curated library of clue/constraint templates and retries seeds that fail uniqueness or necessity checks.
- The in-game **Puzzle proof** panel reports the active seed's real solver result without showing the solution.
- A developer-only blind-solve/difficulty harness may be added after Tier 1. It must use no live LLM, network call, or API key.
- Wrong-code feedback is based on the submitted attempt; never expose the generated code in ordinary play.

## 6. Chime and safety

- Chime patrols three clear points: store office, service corridor, and lift lobby. Timer moves and wrong submissions advance the route. Nearby clue objects lock while he occupies their area.
- The initial 30 seconds give a new player time to inspect the pulsing first clue. Chime movement is always indicated visually or with a Web Audio cue.
- “Contains a jumpscare” appears before play. The scare lasts at most one second, has no flashing faster than three times per second, and respects reduced motion. Mute stays visible on every screen.
- Audio uses Web Audio only. No external music or audio files are required.
- Never ask for or store a real password.

## 7. Art and input

- Pixel-art mode, one 4–6 color palette, one font, integer placement, and nearest-neighbor scaling.
- Soham owns the visual direction and department-store backgrounds. Ishaan supplies separate props and character sprites so hotspots remain independent of the art.
- Follow `ROOM_BLOCKOUT.md`; no UI text or clue hotspots baked into background images.
- The keypad is a touch-first numeric button grid. In the active phone layout, every key is at least 44 CSS pixels. Verify on a real phone before claiming mobile support.
- Keyboard shortcuts may supplement controls; they never replace touch controls.

## 8. Scope and order

### Tier 0 — deploy shell

Publish the existing Vite shell to GitHub Pages. Confirm the deployed URL, asset base path, and Actions status.

### Tier 1 — playable puzzle

One room, eight linked clues, seeded eight-digit code, observation log, numeric keypad, live-after-submit rule feedback, wrong-code penalty, Chime patrol, timer, win/lose, restart, and working phone input.

### Tier 2 — presentation

Final pixel assets, restrained Web Audio, static lore panels, and the solver-proof panel. Keep lore static; no playable minigames in this build.

### Deferred

Three-room campaign, hiding mechanic, daily streaks, and any lore minigames wait until Tier 1 passes phone playtesting and deployment checks.

## 9. Acceptance checklist

- [ ] GitHub Pages build loads with no blank screen and all assets resolve.
- [ ] All eight observations form a fair, interdependent deduction; the red herring is explicitly resolvable.
- [ ] Validator proves one solution per regression seed and proves every constraint necessary.
- [ ] Keypad is numeric, touch-first, and comfortable on a real phone.
- [ ] Wrong submission costs 10 seconds and advances Chime; patrol position changes clue access.
- [ ] First clue pulses; first 30 seconds are forgiving; timer and Chime state are visible.
- [ ] Win, lose, reduced motion, mute, and restart work without console errors.
- [ ] No fixed solution is present in documentation or normal UI.
- [ ] AI proof panel displays actual verifier output; `AI_LOG.md` records prompts, tools, results, and a real caught mistake.

## 10. Pitch

Pitch the game as a seeded department-store lift mystery: collect evidence, connect clues, and enter a code while a clockwork attendant changes which parts of the room are safe to search. Show one clue, one deduction, the validator's proof, and a clean escape.
