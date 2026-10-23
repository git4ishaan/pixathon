# AGENTS.md

Rules for every AI agent working in this repo. Read `PRD.md` first.

## Project

**LAST LIFT** is a pixel deduction escape game set in a closed 1987 department store. The player gathers eight observations, solves a seeded six-digit lift code, and gets out before Chime, a clockwork lift attendant, catches up.

- Goal line: “Find the evidence, solve the lift code, and get out before Chime reaches you.”
- Keypad note: “Demo only. Never enter a real password.”
- Never hard-code or show a static solution. Generate a puzzle from a seed; this is a game puzzle, not security.

## Stack

- TypeScript strict, Phaser 3.90, Vite 7, Bun.
- Commands: `bun install`, `bun run dev`, `bun run typecheck`, `bun run validate`, `bun run build`.
- Do not upgrade Phaser or Vite, add dependencies without a strong reason, or write a custom engine.
- No `any`; fix type errors instead of silencing them.

## Structure

```text
src/main.ts                 Phaser config and scene list
src/config.ts               size, palette, timer, goal text, reducedMotion()
src/game/rules.ts           PURE seeded puzzle generation and evaluation
src/data/clues.ts           eight clue observations and object positions
src/data/lore.ts            static lore panels
src/scenes/                 Boot, Title, Room, End
src/audio/sfx.ts            Web Audio effects only
src/ui.ts                   shared buttons and mute toggle
src/store.ts                localStorage progress, guarded with try/catch
scripts/validate.ts         uniqueness and per-rule necessity checks
```

## Puzzle contract

- Each seed generates a six-digit numeric code and eight linked clue observations. The keypad is on-screen; do not depend on Phaser keyboard text input.
- Found clues add their **observations** to the evidence log. Do not reveal the derived constraint or answer in the clue text.
- Show rule pass/fail feedback only after a complete code submission, not on every keystroke.
- The elevator opens only when all eight constraints pass.
- A submitted wrong code costs 10 seconds and advances Chime one patrol step. Chime's route must affect which clue objects are reachable.
- `bun run validate` must check multiple fixed seeds, prove exactly one solution per seed, and prove every constraint is necessary by removing each one and finding multiple solutions. It must print the seeds checked and the measured result; do not claim unmeasured counts.
- No final solution in `PRD.md`, UI, fixtures, or logs.

## Originality and safety

- Setting: Vale's department store and its service lift, not an arcade. Chime is a clockwork lift attendant, not an animal mascot or modern animatronic. Keep the visual identity distinct.
- Horror stays implied. Never show children being harmed or use gore.
- Title screen says “Contains a jumpscare.” Mute is visible on every screen.
- Jumpscare lasts at most one second, never flashes faster than three times per second, and respects `reducedMotion()`.
- Use Web Audio only; no external music or generated sound dependency.
- Never request or store a real password.

## Art and usability

- Pixel-art mode stays on. Use integer-positioned sprites, nearest-neighbor rendering, and the palette in `config.ts`.
- Keep clue props separate from the room background so their hitboxes can be placed and replaced independently. Follow `ROOM_BLOCKOUT.md`.
- Touch controls must be usable on a phone; keypad buttons need at least 44 CSS pixels in the active mobile layout.
- First clue pulses, timer is always visible, and a first-time player can start without instructions.
- First 30 seconds are forgiving: Chime does not advance on the timer during this period; wrong submissions still cost time and advance the route.
- Provide a development-only hidden speed-up key for demos. It must not change puzzle correctness or appear in player instructions.

## Quality and deployment gates

- Deploy a working Vite shell to GitHub Pages before adding Tier 1 gameplay; verify the published URL before relying on it.
- Before merging **any** work to `main`, `bun run typecheck`, `bun run validate`, and `bun run build` must pass. No exceptions for agent-owned files.
- Browser-check the changed flow on desktop and a real phone when available; report checks that could not be run.
- Restart must work without reloading. No console errors.
- Tier 1 must be playable before Tier 2. No playable lore minigames in this build; lore is static panels.

## Git and ownership

- Commit working changes with clear messages. Do not merge into `main` unless all quality gates pass. Never push a broken build to `main`.
- Never commit API keys or secrets. This repository is public.
- **Soham:** visual direction, room/title backgrounds, final art and playability approval. Replace the current arcade-style `main_menu_bg.png` before release.
- **Ishaan:** separate room and prop sprites in `public/assets/`; send an asset manifest with filenames and dimensions.
- **Mitansh:** `src/game/rules.ts`, `src/data/clues.ts`, and `scripts/`; puzzle generation, observations, and validator.
- **Aarush:** `src/scenes/RoomScene.ts`, `src/main.ts`, and gameplay UI; use the shared puzzle exports and `ROOM_BLOCKOUT.md`.
- **Codex:** integration review, documentation, and verification support. Coordinate before touching another owner's active files.
- `AI_LOG.md` and `README.md` are append-only for agents.

## Logging and work order

- After each major step, append the prompt, tool, result, and next step to `AI_LOG.md`; never rewrite existing entries.
- Record real mistakes and how they were caught; never invent one.
- Keep the first build playable. Follow the tiers in `PRD.md` and record assumptions in the log.
