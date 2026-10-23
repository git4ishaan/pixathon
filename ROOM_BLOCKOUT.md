# Room blockout — Tier 1

One fixed 960×540 arcade room for the first playable level. The room stays on screen while clues are inspected and the passcode is entered.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOAL LINE                                              TIMER   CHIME DISTANCE │ 0–64
├─────────────────────────────────────────────────┬────────────────────────────┤
│ Missing poster     Wall calendar       Radio    │                            │
│                                                 │   6-character passcode     │
│ Lobby statues      Plaque       Elevator        │   discovered rules         │
│                                  + panel         │   keypad                    │
│ Ticket stub        Party table               │                            │
│                  [first clue pulses]            │                            │
└─────────────────────────────────────────────────┴────────────────────────────┘
  Room view: x=0–679, y=64–539                 Control rail: x=680–959
```

## Placement rules

- Reserve the top 64 pixels for the always-visible goal and timer.
- Keep the room objects in the left 680 pixels; keep the keypad and rule checklist in the right 280-pixel rail.
- Put the party table in the lower-left/center as the first highlighted clue.
- Group the poster, calendar, radio, and plaque on the back wall; keep statues, ticket stub, and elevator panel near their related room features.
- Give each clue a distinct, generously sized click target. Do not let the control rail cover room objects.
- On narrow screens, let the room view and control rail switch views or stack; preserve access to both without shrinking the 8 clue targets.

## Next step

Lock clue object IDs and text against the PRD, then decide each object's exact coordinates and click target size with the driver before implementing the room scene.
