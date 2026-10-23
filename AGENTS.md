# AGENTS.md

Rules for every AI agent working in this repo (Antigravity, Claude Code, Codex CLI, OpenCode).

## Project
A playable puzzle game, built in a 2-hour hackathon. Judges score: smart use of AI (40), creativity and originality (20), usability (15), feel and design (10), pitch (10), fun factor (5).

> Fill these in once the problem statement is chosen:
> - Game name:
> - One-line pitch:
> - Core rule (2 sentences):
> - How levels progress (one new idea per level):

## Tech rules
- Static web app only. Opens from index.html. No build step, no frameworks, no external assets or CDNs.
- Files: index.html, style.css, game.js, audio.js, levels.json.
- Keep game logic (the `Logic` object in game.js) separate from rendering and DOM code, so a solver can reuse it.
- Controls: keyboard (arrows/WASD, Z undo, R restart) AND touch/click. Always keep a move counter, undo and restart.
- Colors and fonts live in the CSS variables at the top of style.css. Restyle there, not inline.
- Wrap all localStorage use in try/catch.
- No console errors. Test in the browser before saying a task is done.
- Note: fetch('levels.json') needs a local server (`python -m http.server`) or GitHub Pages.

## Git rules
- Commit after every working change with a clear message ("playable core loop", "added solver"). Judges read the history.
- Never leave `main` broken. Work on your own branch and merge when it runs.
- Never commit API keys or secrets. This repo is public.

## File ownership (avoid edit conflicts)
- game.js: Driver agent
- solver.js, levels.json: level/solver agent
- style.css, audio.js, index.html markup: juice agent
- AI_LOG.md, README.md: Bard (humans plus any agent, append only)

## Logging (worth up to 40 points)
- After every major step, append to AI_LOG.md: the prompt used, the tool, and the result.
- Record at least one time the AI got it wrong, and how it was caught.
- Do not rewrite or delete existing log entries.

## Working style
- Get a playable build first. Ugly is fine. Never go 20 minutes without a playable build.
- Each level introduces exactly one new idea.
- If something is ambiguous, make a reasonable choice, note it in AI_LOG.md, and keep going.
