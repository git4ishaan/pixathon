# Room blockout — Tier 1

One fixed 960×540 arcade room. The room stays visible while clues are inspected and the passcode is entered.

## Screen zones

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Goal line                                                     Timer / Chime  │ y=0–63
├─────────────────────────────────────────────────┬────────────────────────────┤ y=64
│ [poster]   [calendar]   [radio]   [plaque]      │ 6-character passcode       │
│                                                 │ discovered-rule checklist  │
│                                                 │ keypad                      │
│ [party table] [ticket stub] [three statues]    │                             │
│                                      [lift panel]│                            │
└─────────────────────────────────────────────────┴────────────────────────────┘ y=539
  Room view: x=0–679, y=64–539                  Control rail: x=680–959
```

## Clue positions

Coordinates are centers in the 960×540 game canvas. Hotspots are separate from the art, use rectangular bounds, and never overlap. At a 320px-wide canvas, each listed 120×132 target scales to 40×44px for touch.

| Order | Clue object | Center (x, y) | Hotspot (w × h) | Placement |
|---:|---|---:|---:|---|
| 1 | Party table | (130, 365) | 120 × 132 | Lower left foreground; pulse this first |
| 2 | Lobby statues | (455, 350) | 120 × 132 | Right foreground, left of the elevator |
| 3 | Missing poster | (100, 160) | 120 × 132 | Upper back wall, left |
| 4 | Wall calendar | (250, 160) | 120 × 132 | Upper back wall, left-center |
| 5 | Radio | (400, 160) | 120 × 132 | Upper back wall, right-center |
| 6 | Ticket stub | (290, 380) | 120 × 132 | On a low ticket counter between table and statues |
| 7 | Plaque | (550, 160) | 120 × 132 | Upper back wall, right |
| 8 | Elevator panel | (612, 315) | 120 × 132 | Beside the elevator; stays inside the room view |

The closest horizontal target gaps are 30px between wall objects and 37px between the statues and lift panel. The control rail starts at x=680, leaving 8px after the lift-panel target. The wall targets begin 30px below the 64px top bar.

## Art and adaptation notes

- Generate the room architecture as a background; place the eight clue props as separate sprites at these coordinates. That keeps the clickable clue art aligned and replaceable.
- Keep the goal/timer header and control rail out of the background image.
- On narrow screens, switch between the room view and control rail or stack them; preserve the clue targets' touch size.

## Next step

Create the room background around these reserved spaces, then integrate the eight separate clue sprites and hotspots.
