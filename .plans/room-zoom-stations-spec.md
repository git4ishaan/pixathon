# Room redesign: overview + zoom stations (spec)

Status: decided via interview, 2026-10-23. Owner: Aarush (RoomScene / gameplay UI).
Supersedes the single-screen layout in `ROOM_BLOCKOUT.md` (update that file alongside the code).

## Problem

The current room is one cramped 960x540 screen: eight small hotspots, a popup of raw text, and a right-hand control rail. It does not feel like an escape room. Target feel: a readable overview of the lobby; click a prop and the camera zooms into a closeup; inside, click sub-props and do a small task; finishing it adds verified facts (and sometimes a digit) to the code.

## Decisions (from interview)

| Topic | Decision |
|---|---|
| Digit model | Keep the 8-constraint unique-solution engine (`rules.ts`, `validate.ts`) untouched. A station is a prop; solving its inner task seals its facts. Exact stations seal a digit, relational stations seal a relation. No promise of one digit per station. |
| Overview | One lobby view, 8 prop hotspots. Chime's current patrol zone is tinted; blocked props get a chain/"Chime is here" overlay. |
| Zoom depth | One level: overview -> closeup with 2-4 clickable sub-props. |
| Inner tasks | All three: (1) find hidden sub-props by clicking, (2) decode with another station's item, (3) a small tactile action (dial, page flip, swap). |
| Art | Procedural pixel art in Phaser Graphics (palette from `config.ts`, integer positions, nearest-neighbor). Behind a `StationDef` interface so Ishaan's PNGs replace art per station without touching logic. |
| Chime blocking | Overview hotspot is blocked while Chime occupies that prop's area (`isClueLocked`). If Chime advances while a closeup is open, the player may finish; the block applies on next entry. |
| Persistent UI | Header: goal line, timer, Chime pips, always visible. Bottom dock with tabs: Evidence and Keypad, opening as sheets over the room. Same layout on desktop and phone. |
| Code entry | Six slots. Digits sealed by a solved exact station auto-fill and lock (distinct colour). Player types the rest and submits all six. Pass/fail only after submit. |
| Motion | Camera zoom-and-pan tween about 250 ms. Instant cut under `reducedMotion()`. Portrait phones letterbox the 960x540 canvas. |
| Scope pass 1 | Framework plus 3 bespoke stations (party table, radio + service panel, missing poster + plaque ledger). The other five use a generic closeup template. |
| Ownership | Aarush builds scene + station framework. Fragment data change is a separate small PR for Mitansh. |
| Verification | Pure `stationState` module, asserted headlessly for fixed seeds, plus manual desktop + phone checklist, plus the dev speed-up key extended to step Chime. |

## Fixed constraints (do not break; from AGENTS.md)

- No hard-coded solution; everything from the seed. Observations never reveal the derived constraint. No answer in UI, fixtures, or logs.
- Rule pass/fail only after a complete 6-digit submit. Wrong submit = +10 s and Chime advances one step.
- First 30 s: Chime does not advance on the timer. First clue pulses. Timer always visible. No instructions needed to start.
- Keypad keys at least 44 CSS px in the active mobile layout. Mute visible on every screen. Jumpscare at most 1 s, at most 3 flashes/s, respects `reducedMotion()`.
- Restart works without reload. No console errors. `bun run typecheck`, `bun run validate`, `bun run build` pass before merging to `main`.
- No new dependencies. No `any`.

## Architecture

```text
src/game/stations.ts        PURE. Station state machine, no Phaser/DOM
src/scenes/RoomScene.ts     Orchestrates overview, closeup, dock, header
src/scenes/room/Overview.ts Lobby drawing, hotspots, Chime tint/blocked overlays
src/scenes/room/Closeup.ts  Camera zoom, closeup container, sub-prop hit areas
src/scenes/room/Dock.ts     Bottom dock + Evidence/Keypad sheets
src/scenes/room/stations/   One file per bespoke station + generic template
src/keypad.ts               Slots + locked digits (extend, keep 44px keys)
```

### `stations.ts` (pure)

```ts
type SubPropId = string;
interface StationProgress {
  clueId: ClueId;
  revealed: ReadonlySet<SubPropId>;   // sub-props the player has clicked
  taskDone: boolean;                  // inner task solved
}
interface StationsState {
  progress: ReadonlyMap<ClueId, StationProgress>;
  sealed: ReadonlyMap<number, number>; // seat index -> digit, exact stations only
}
reveal(state, clueId, subProp): StationsState
completeTask(state, clueId): StationsState
canEnter(chime: ChimeState, clueId): boolean   // wraps isClueLocked
sealedDigits(state): ReadonlyMap<number, number>
```

Rules:
- A station is complete when every required sub-prop is revealed and its task is done. Only then do its facts join the Evidence log and its digit (if exact) is sealed.
- "Needs" links (radio needs service panel, poster and calendar need plaque) are decode steps: the task is unsolved until the needed station is complete. The closeup shows a "cross-reference" slot that fills from the needed station.
- Exact stations are those whose constraint pins one seat: party-table (exact variant), lobby-display (exact variant), radio, poster (via ledger). Which seeds produce an exact vs relational variant is seed-dependent; the UI derives this from the constraint kind, not from a hard-coded list.
- Never expose the full code. `sealed` holds only digits the player earned through a station.

### Data: fragments (separate PR for Mitansh)

Add optional `fragments?: { subProp: SubPropId; text: string }[]` to `ClueInstance` in `types.ts`, emitted by the existing templates in `rules.ts`. `observation` stays and equals the fragments joined, so validator and fixtures are unchanged.

Until it lands, the UI splits `observation` into sentences and assigns them to the station's sub-props in order (fallback only; remove once fragments exist). The fallback must not change what `submitCode` or `verifyPuzzle` see.

For exact stations the template must also expose the seat index and digit to the pure state module as a sealed fact only after completion. This must go through a rules.ts export (e.g. `describeFact(puzzle, clueId)` returning kind + seat + digit) that is gated to found clues. Because the source is public this is gameplay, not secrecy; the existing comment in `rules.ts` already says so. Agree the exact signature with Mitansh first.

## Screens and layout (960x540 logical)

```text
+--------------------------------------------------------------+
| goal line                              timer   Chime o o o   | 0-48 header
+--------------------------------------------------------------+
|                                                              |
|     OVERVIEW: lobby with 8 props, or CLOSEUP of one prop     | 48-484
|                                                              |
+--------------------------------------------------------------+
| [Back]   [Evidence (n/8)]  [Keypad]  [mute]  slots 1 2 3 4 5 6| 484-540 dock
+--------------------------------------------------------------+
```

- Overview: props large enough to read at phone scale (target at least 88 px logical, hitboxes at least 44 CSS px after scaling; verify at the narrowest supported width). Chime zone tinted by patrol point; blocked props show chain and "Chime is here" text, and their hotspot refuses entry with a short shake (no shake under reducedMotion).
- First clue (party table) pulses in the overview. Pulse stops after first entry.
- Closeup: zoom tween from the hotspot to fill the view area; Back button always at dock left; Esc and tap-outside also return. 2-4 sub-props with visible hover/pressed states. Revealed sub-props show a small tick.
- Evidence sheet: list of completed stations with their fragments and sealed digit or relation chip. Uncompleted stations show only their name. Sheet covers the room, does not pause the timer.
- Keypad sheet: six slots, locked slots in sealed colour, numeric keys 44 CSS px minimum, Submit enabled only with all six filled. Result feedback appears after submit only.
- Mute button is in the dock and header-visible on every scene.

## Station designs (pass 1)

1. **Party table (free, never blocked).** Sub-props: place cards 1-6, candle holder, cake sketch. Task: tap the card named by the template to read its candle count. Exact variant seals a digit; "up to N" variant yields a relation chip.
2. **Radio + Service panel (corridor / lift-lobby).** Radio: turn a dial through low / middle / high tones, count pulses. Service panel: open cover to reveal the frequency chart (seat per tone) and the worn keys. Radio's task completes only after the panel's chart is found; this exercises the decode link and the Chime routing (radio and panel sit in different areas).
3. **Missing poster + Plaque.** Poster: tilt it to find the locker tag letter. Plaque: engraved ledger A=0..J=9. Poster task completes when the player picks the matching ledger entry; seals that seat's digit.
4. **Generic template (calendar, ticket stub, lobby display, plaque body):** closeup with 2-3 clickable regions each revealing one fragment. Calendar adds a page-flip between JUNE 1987 and MAY 1986 (the "stale" note is a distractor).

## Edge cases

- Restart: all station state resets with the new `RoomScene` instance; no module-level state.
- Chime catches the player while in a closeup: close the closeup, then run the existing jumpscare path.
- Timeout while a sheet is open: close sheets first, then show the end scene.
- Wrong submit with sealed digits: locked slots stay; only unlocked slots clear.
- Entering a blocked prop via keyboard or tap: same refusal, no state change.
- Persisted progress in `store.ts` stays try/catch guarded; do not store sealed digits (derivable from the seed, but not needed).
- Dev-only speed-up key stays hidden and out of instructions; add a second dev key to step Chime, both gated by `import.meta.env.DEV`.

## Verification plan

1. `scripts/stations.check.ts` (new file, not `validate.ts`, so Mitansh's file stays untouched; wire into `validate` only after agreeing with them). For each fixed seed, print seeds checked and measured results for:
   - a station cannot be entered while `isClueLocked` is true and can after Chime moves;
   - sealed digits only ever equal the real digit at that seat (checked through `submitCode` on a candidate built from sealed digits plus search, not by exposing the code);
   - completion order does not matter, and the Needs links hold.
2. `bun run typecheck`, `bun run validate`, `bun run build` all pass.
3. Manual, desktop and a real phone (report if the phone check cannot be run): start without instructions; enter every station; get blocked by Chime; back out mid-task; open Evidence and Keypad over the room; wrong submit then correct submit; restart without reload; mute; reducedMotion on; console clean.

## Build order

1. Pure `stations.ts` and its check script.
2. Header + dock + sheets + keypad slots (replace the control rail).
3. Overview with procedural lobby, hotspots, Chime tint/blocked.
4. Closeup framework: zoom tween, Back, sub-prop hit areas, generic template.
5. Three bespoke stations.
6. Update `ROOM_BLOCKOUT.md`, append to `AI_LOG.md`.
7. Separate PR/note for Mitansh: `fragments` and fact descriptor.

## Open items

- Exact fact-descriptor signature in `rules.ts` (Mitansh).
- Final prop sizes after seeing the procedural overview on a phone.
- Whether Soham wants the overview background replaced by `main_menu_bg.png` successor art, or fully procedural until final art lands.
- Existing uncommitted changes on `room-loop` (rules.ts, clues.ts, RoomScene.ts, validate.ts, keypad.ts, EndScene.ts, chime.ts) must be committed or stashed before starting, so this work doesn't tangle with them.
