# AGENTS.md

Rules for every AI agent working in this repo (Antigravity, Claude Code, Codex CLI, OpenCode). Read PRD.md first.

## Project
**LAST LIFT**: a pixel escape-room puzzle for Pixathon, problem statement 2 (Puzzle Passwords). The player finds 8 clues in a room, builds a 6-character elevator passcode, and escapes before the mascot Chime reaches them. Judging: smart use of AI (40), creativity (20), usability (15), feel and design (10), pitch (10), fun (5).

- **Goal line (always on screen):** Find the clues, build the elevator passcode, and escape before Chime reaches you.
- **Passcode:** `3M5#76`. Never print it in the UI. The validator must confirm it is the only valid code.
- **Required note on the keypad:** "Demo only. Never enter a real password."

## Tech rules
- Static web app. Opens from index.html. No build step, no frameworks, no external assets or CDNs.
- Files:
  - `index.html`: screens and markup
  - `style.css`: styling, colors and fonts only via CSS variables at the top
  - `rules.js` and `rules.json`: the 8 rules and clues (data plus `check(code)` functions)
  - `game.js`: state machine, timer, input, rendering
  - `scenes.js`: lore scenes and the jumpscare
  - `audio.js`: Web Audio sounds (already in repo)
  - `validate.js`: Node script that brute-forces all codes against `rules.js` and prints how many pass
- Replace the starter's grid `Logic` object and `levels.json`. Reuse the screen switching, `Store` (localStorage in try/catch), and `Sfx`.
- Keep rule logic (`rules.js`) free of DOM code so `validate.js` can import it.
- Game states: `title`, `room`, `win`, `lose`, `scene`. Only one active at a time.
- Controls: mouse, touch and keyboard (Tab and Enter for objects, type in the keypad, R restart, M mute).
- `fetch()` needs a local server (`python -m http.server`) or GitHub Pages.

## Rule engine contract
```js
// rules.js
const RULES = [
  { id: 1, clueId: 'party-table', text: 'Has 6 characters', check: (c) => c.length === 6 },
  // ... 8 total, each with a clueId matching an object in the room
];
// A rule is shown on the checklist only after its clue is found.
// Each rule displays pass or fail live as the player types.
// The elevator opens only if ALL 8 rules pass.
```

## Content rules
- Original characters only: Chime (bellhop bunny), Biscuit (baker bear), Pip (ringmaster parrot). **Do not use Five Nights at Freddy's names, sprites, music or text.**
- Horror is implied only. Never show children being harmed. No gore, no on-screen death of children.
- Title screen must show "Contains a jumpscare". Mute toggle must be visible on every screen.
- Jumpscare: at most 1 second, no flashing faster than 3 times per second, respect `prefers-reduced-motion`.
- Never ask for or store a real password.

## Quality bar
- No console errors. Test in a browser before saying a task is done.
- A first-time player understands the game without help: goal line, pulsing first object, visible timer.
- Works on phone and laptop. Restart works without reloading.

## Git rules
- Commit after every working change with a clear message. Judges read the history.
- Work on your own branch and merge into `main` only when it runs. Never leave `main` broken.
- Never commit API keys or secrets. This repo is public.

## File ownership (avoid edit conflicts)
- `game.js`, `index.html` logic: Driver agent (Antigravity)
- `rules.js`, `rules.json`, `validate.js`: rule agent (Claude Code, Codex for validator review)
- `style.css`, `audio.js`, `scenes.js`: juice agent (OpenCode and Artist)
- `AI_LOG.md`, `README.md`: Bard (append only)

## Logging (worth up to 40 points)
- After every major step, append to AI_LOG.md: the prompt, the tool, and the result.
- Record at least one time the AI got it wrong and how it was caught.
- Never rewrite or delete existing log entries.

## Working style
- Playable build first. Ugly is fine. Never go 20 minutes without a playable build.
- Build in tiers from PRD.md section 10. Finish Tier 1 before starting Tier 2.
- If something is ambiguous, make a reasonable choice, note it in AI_LOG.md, and keep going.
