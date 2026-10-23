# AI Log

## Scaffold: Bun + Vite
- Prompt: Switch the JavaScript runtime/package manager to Bun and set up the basic Vite app scaffold for LAST LIFT.
- Tool: Codex with PowerShell and `apply_patch`.
- Result: Added a strict TypeScript, Vite 7, Phaser 3.90 starter with Boot, Title, Room, and End scenes; updated project instructions to use Bun.
- Mistake caught: My first package manifest draft omitted the Bun toolchain declaration. I caught it while reviewing the package setup and added `packageManager: bun@1.4.0` before installing dependencies.

## Main menu research and implementation
- Prompt: Research the requested mascot-survival horror aesthetic and build the LAST LIFT main menu.
- Tool: Web search, Codex, and `apply_patch`.
- Result: Built an original Pocket Palace lobby menu with a surveillance overlay, a still Chime silhouette, reduced-motion-aware status light, keyboard/mouse start, jumpscare notice, goal line, password safety reminder, and Phaser sound toggle. No franchise media or text was used.
- Research: [Scott Cawthon interview](https://www.indiegamemag.com/igm-interviews-scott-cawthon-five-nights-at-freddys/) discusses restrained movement and limited visibility; [visual analysis](https://sightlines.media/film/507089/five-nights-at-freddy-s-2023) describes static framing, shadows, thresholds, and decayed family-entertainment spaces. Applied those broad atmosphere cues to LAST LIFT's own setting.

## Main menu revision
- Prompt: Remove the generated-looking menu background; keep a pixelated aesthetic for a background the user will provide, and use a shared branch named Soham.
- Tool: Codex and `apply_patch`.
- Result: Removed the hand-drawn lobby, elevator, mascot, scanlines, and status light. Kept a spare hard-edged title menu that works over a future user-provided background. Phaser pixel-art rendering remains enabled.
- Mistake caught: The first menu illustration looked synthetic and did not fit the user's art direction. User feedback caught the mismatch; the illustration has been removed.

## Main menu background asset
- Prompt: Add the attached `main_menu_bg.png` to the main menu.
- Tool: Codex image inspection and `apply_patch`.
- Result: Moved the attached pixel-art scene into `public/assets/` and loaded it as the title background using Vite's base URL so it works in local and subpath deployments. Phaser pixel-art mode keeps the image crisp.
- Mistake caught: The first typecheck found that Vite client types were not declared in the new scaffold. Added Vite's standard client type reference so the base URL is typed correctly.

## Tier 1 room blockout
- Prompt: Work step by step on room design and keep the log useful for resuming after context limits.
- Tool: Codex with `apply_patch`.
- Result: Added `ROOM_BLOCKOUT.md` for one 960×540 room with a 64px goal/timer header, 680px clue area, 280px control rail, and the party table as the first pulsing clue. RoomScene implementation remains with its designated owner.
- Next: Lock clue IDs/text to the PRD, then agree on exact object positions and click target sizes before the driver implements the scene.

## Room clue coordinates
- Prompt: Determine the eight clue positions carefully before generating the room.
- Tool: Codex planning and `apply_patch`.
- Result: Replaced rough placement notes in `ROOM_BLOCKOUT.md` with exact centers and 120×132 logical touch targets. Four wall clues occupy an evenly spaced row; party table, ticket stub, lobby statues, and lift panel form a separated foreground row. Props stay in the 680px room view, clear of the right control rail and top HUD. Background art will contain architecture only; clues remain separate sprites.
- Next: Generate the room architecture around these reserved positions, then integrate sprites and hotspots.

## Team split — Tier 1
- Prompt: Split remaining game work between Mitansh and Aarush while Ishaan continues sprites.
- Tool: Codex planning.
- Result: Mitansh owns `src/game/rules.ts`, `src/data/clues.ts`, and `scripts/validate.ts`: implement the eight clue/rule data and prove the unique solution. Aarush owns `src/scenes/RoomScene.ts` and gameplay UI: wire clue discovery, keypad/live checklist, timer, win/lose, and restart using `ROOM_BLOCKOUT.md`; consume Mitansh's exports rather than duplicating puzzle logic. Ishaan continues separate room/prop sprites under `public/assets/` and supplies a filename/dimensions list for integration. Keep Tier 2 polish until Tier 1 works.
- Coordination: Agree on clue IDs and exported data shape first. Mitansh can build the pure rules/validator independently; Aarush can block out the room with placeholders, then connect the exported clue/rule data. Integrate Ishaan's art after the click targets are stable.

## Soham and Codex ownership
- Prompt: Include the user and Codex in the work split.
- Tool: Codex planning.
- Result: Soham owns visual direction, creates/revises the room background from `ROOM_BLOCKOUT.md`, and gives final art/playability feedback. Codex owns integration support across the separate workstreams, code review, and build/validator checks; Codex does not create replacement room artwork.

## Mitansh — Rule engine, clue data, and validator (branch: mitansh)
- Prompt: Analyse tasks from PRD and AI_LOG, build work into phases, create a branch `mitansh`, and start working.
- Tool: Antigravity (read PRD.md, AI_LOG.md, ROOM_BLOCKOUT.md, all src files; wrote src/game/rules.ts, src/data/clues.ts, src/store.ts, scripts/validate.ts; updated package.json and tsconfig.json; ran typecheck and validate).
- Result: Implemented all Mitansh-assigned files from the AI_LOG team split.
  - `src/game/rules.ts`: 8 `Rule` objects matching PRD §6 — length, first-digit-3, second-letter-M, last-digit-6, fourth-char-#, digit-sum-21, no-repeat, flanking-5-7 — plus `evaluate()` for live keypad feedback and `prefixOk()` for partial-code highlighting. Pure TypeScript, no Phaser imports.
  - `src/data/clues.ts`: 8 `Clue` records with exact centres from ROOM_BLOCKOUT.md (120×132 hot-spots), narrative clue text tied to each rule, and `pulse: true` on the party table.
  - `src/store.ts`: localStorage wrapper with try/catch on every read/write; tracks `loreIndex` and `attempts`.
  - `scripts/validate.ts`: pruned brute-force (position-fixed search) enumerates all legal 6-char codes and asserts exactly one passes all 8 rules.
  - `package.json`: added `validate` script (`npx tsx scripts/validate.ts`).
  - `tsconfig.json`: extended `include` to cover `scripts/`, added `@types/node` for `process.exit`.
- Validator output: `PASS: exactly one valid passcode.` (found `3M5#76`; matches SECRET).
- Typecheck: zero errors.
- Mistake caught: The first validator draft imported `CHARSET` from rules.ts but the pruned validator defines its own candidates array, leaving `CHARSET` unused — a compile error under `noUnusedLocals`. Caught by `tsc --noEmit` and fixed by removing the stale import.
- Branch `mitansh` pushed; PR: https://github.com/git4ishaan/pixathon/pull/new/mitansh

