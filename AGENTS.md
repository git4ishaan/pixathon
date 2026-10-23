# AGENTS.md

Rules for every AI agent working in this repo (Antigravity, Claude Code, Codex CLI, OpenCode). Read PRD.md first.

## Project
**LAST LIFT**: a pixel escape-room puzzle for Pixathon, problem statement 2 (Puzzle Passwords). The player finds 8 clues in a room, builds a 6-character elevator passcode, and escapes before the mascot Chime reaches them. Judging: smart use of AI (40), creativity (20), usability (15), feel and design (10), pitch (10), fun (5).

- **Goal line (always on screen):** Find the clues, build the elevator passcode, and escape before Chime reaches you.
- **Required note on the keypad:** "Demo only. Never enter a real password."
- **Passcode:** a spoiler stored only in `src/game/rules.ts` (`SECRET`). Never show it in the UI.

## Stack
- TypeScript (strict), Phaser 3.90, Vite 7. Node 22.
- Runtime and package manager: Bun. Commands: `bun install`, `bun run dev` (http://localhost:5173), `bun run typecheck`, `bun run validate`, `bun run build`.
- Do not upgrade Phaser or Vite. Do not add new dependencies without a strong reason. Do not write a custom engine.
- No `any`. Fix type errors instead of silencing them.

## Structure
```
src/main.ts            Phaser config and scene list
src/config.ts          constants: size, colors, timer, text (restyle here)
src/game/rules.ts      PURE logic: the 8 rules and evaluate(). No Phaser or DOM imports
src/data/clues.ts      the 8 clickable objects (position, label, clue text)
src/data/lore.ts       lore scene text
src/scenes/            BootScene, TitleScene, RoomScene, EndScene
src/audio/sfx.ts       Web Audio sound effects (no audio files)
src/ui.ts              shared button and mute toggle
src/store.ts           localStorage progress (try/catch)
scripts/validate.ts    brute-forces all codes; must report exactly one valid passcode
```

## Rule contract
- Each rule in `rules.ts` has `{ id, clueId, text, check(code), prefixOk? }`. `clueId` must match a clue in `clues.ts`.
- A rule appears on the keypad checklist only after its clue is found, and shows pass or fail live.
- The elevator opens only when ALL rules pass.
- After ANY change to rules or clues, run `bun run validate`. It must print `PASS: exactly one valid passcode.`

## Content rules
- Original characters only: Chime (bellhop bunny), Biscuit (baker bear), Pip (ringmaster parrot). **Do not use Five Nights at Freddy's names, sprites, music or text.**
- Horror is implied only. Never show children being harmed. No gore, no on-screen death of children.
- Title screen shows "Contains a jumpscare." A mute toggle is visible on every screen.
- Jumpscare: at most 1 second, no flashing faster than 3 times per second, respect `prefers-reduced-motion` (use `reducedMotion()` from config).
- Never ask for or store a real password.

## Art and assets
- Placeholder art is drawn in code. Real pixel art goes in `public/assets/` and loads in `BootScene`.
- Pixel-art mode is on. Keep sprites crisp: integer scales, no smoothing, one palette defined in `config.ts`.

## Quality bar
- `bun run typecheck`, `bun run validate` and `bun run build` must pass before every merge.
- No console errors. Test in the browser before saying a task is done.
- A first-time player understands the game without help: goal line, pulsing first object, visible timer.
- Works on phone and laptop. Restart works without reloading.

## Git rules
- Commit after every working change with a clear message. Judges read the history.
- Work on your own branch and merge into `main` only when it builds. Never leave `main` broken. Pushes to `main` auto-deploy to GitHub Pages.
- Never commit API keys or secrets. This repo is public.

## File ownership (avoid edit conflicts)
- `src/scenes/RoomScene.ts`, `src/main.ts`: Driver agent (Antigravity)
- `src/game/*`, `src/data/clues.ts`, `scripts/*`: rule agent (Claude Code, Codex reviews the validator)
- `src/scenes/EndScene.ts`, `src/scenes/TitleScene.ts`, `src/audio/*`, `src/data/lore.ts`, `public/assets/*`: juice agent (OpenCode and Artist)
- `AI_LOG.md`, `README.md`: Bard (append only)

## Logging (worth up to 40 points)
- After every major step, append to AI_LOG.md: the prompt, the tool, and the result.
- Record at least one time the AI got it wrong and how it was caught.
- Never rewrite or delete existing log entries.

## Working style
- Playable build first. Ugly is fine. Never go 20 minutes without a playable build.
- Build in tiers from PRD.md section 10. Finish Tier 1 before starting Tier 2.
- If something is ambiguous, make a reasonable choice, note it in AI_LOG.md, and keep going.
