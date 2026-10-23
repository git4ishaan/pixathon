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
