export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PALETTE = {
  ink: 0x17131f,
  paper: 0xf5e8c8,
  lamp: 0xf2b84b,
  danger: 0xc64a4a,
  muted: 0x8e8495,
} as const;

export const GOAL_LINE = 'Find the clues, build the elevator passcode, and escape before Chime reaches you.';

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
