/**
 * LAST LIFT — clue data.
 * Each entry maps to one clickable object in the room and one rule in rules.ts.
 *
 * Coordinates are centres in the 960×540 canvas (see ROOM_BLOCKOUT.md).
 * Hot-spot size is 120×132 for all objects.
 */

export interface Clue {
  /** Must match a Rule.clueId in rules.ts */
  id: string;
  /** Short label shown in the found-clue log */
  label: string;
  /** Full clue text shown in the inspector popup when the player clicks the object */
  text: string;
  /** Centre of the clickable hot-spot in game canvas pixels */
  x: number;
  y: number;
  /** Hot-spot dimensions in game canvas pixels */
  width: number;
  height: number;
  /**
   * If true, this clue's hot-spot pulses on first load to guide new players.
   * Only one clue should have this set to true.
   */
  pulse?: boolean;
}

export const CLUES: Clue[] = [
  {
    id: 'party-table',
    label: 'Party Table',
    text:
      'Six colourful paper hats sit around the table, one for each child. ' +
      'The cake has six candles. The passcode is exactly as long as the number of guests.',
    x: 130,
    y: 365,
    width: 120,
    height: 132,
    pulse: true,   // first object — pulsing guide for new players
  },
  {
    id: 'lobby-statues',
    label: 'Lobby Statues',
    text:
      'Three mascot statues stand in the lobby — Chime the bellhop bunny, ' +
      'Biscuit the baker bear, and Pip the ringmaster parrot. ' +
      'The first character of the passcode equals the number of statues.',
    x: 455,
    y: 350,
    width: 120,
    height: 132,
  },
  {
    id: 'missing-poster',
    label: 'Missing Poster',
    text:
      'A faded poster on the wall. The first name at the top — printed in bold — is MIA. ' +
      "Her initial is the second character of the passcode.",
    x: 100,
    y: 160,
    width: 120,
    height: 132,
  },
  {
    id: 'wall-calendar',
    label: 'Wall Calendar',
    text:
      'A 1987 calendar hangs on the wall. Every page from January to June is torn off. ' +
      'The month Pocket Palace closed is the last character of the passcode.',
    x: 250,
    y: 160,
    width: 120,
    height: 132,
  },
  {
    id: 'radio',
    label: 'Old Radio',
    text:
      'The radio crackles to life when you touch it: three low beats… then a sharp hiss. ' +
      'The fourth character of the passcode is the symbol that sounds like static: #.',
    x: 400,
    y: 160,
    width: 120,
    height: 132,
  },
  {
    id: 'ticket-stub',
    label: 'Ticket Stub',
    text:
      '"ADMIT 21" is stamped across the stub in faded ink. ' +
      'The four digits in the passcode must add up to 21.',
    x: 290,
    y: 380,
    width: 120,
    height: 132,
  },
  {
    id: 'plaque',
    label: 'Brass Plaque',
    text:
      'A brass plaque mounted on the back wall reads: "No two children alike." ' +
      'No character in the passcode may appear more than once.',
    x: 550,
    y: 160,
    width: 120,
    height: 132,
  },
  {
    id: 'elevator-panel',
    label: 'Elevator Panel',
    text:
      'The elevator call-panel has twelve buttons. Buttons 5 and 7 are worn smooth — ' +
      'pressed thousands of times. The lowest worn button comes first. ' +
      'The digits on each side of # in the passcode are 5, then 7.',
    x: 612,
    y: 315,
    width: 120,
    height: 132,
  },
];
