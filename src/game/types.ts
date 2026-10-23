/**
 * LAST LIFT: shared contract between rules (pure), RoomScene, Keypad and Chime.
 * Pure types only. No Phaser, no DOM. The generated code is never part of these types.
 */

export const CLUE_IDS = [
  'party-table',
  'lobby-display',
  'missing-poster',
  'wall-calendar',
  'radio',
  'ticket-stub',
  'plaque',
  'service-panel',
] as const;

export type ClueId = (typeof CLUE_IDS)[number];

/** One clickable object in the room for the active seed. */
export interface ClueInstance {
  id: ClueId;
  label: string;
  /** Raw observation shown in the evidence log. Never states a position or digit. */
  observation: string;
  /** Clues whose observations are needed to interpret this one (shown as "needs ..."). */
  needs: ClueId[];
  /** Hotspot centre and size in canvas pixels (see ROOM_BLOCKOUT.md). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** True for exactly one clue: the pulsing first object. */
  pulse?: boolean;
}

/** A generated puzzle. Holds NO answer; the code lives inside rules.ts. */
export interface Puzzle {
  seed: string;
  clues: ClueInstance[];
}

export interface SubmissionResult {
  /** True only when every constraint passes (all eight, even if some clues are unfound). */
  pass: boolean;
  /** Pass/fail for each DISCOVERED clue's constraint. Undiscovered clues are omitted. */
  results: { clueId: ClueId; ok: boolean }[];
}

/** Measured solver output. The UI proof panel must print these numbers, not literals. */
export interface ProofReport {
  seed: string;
  /** Size of the enumerated space (1,000,000 for six digits). */
  candidates: number;
  /** Count of codes satisfying all constraints. Must be 1. */
  solutions: number;
  /** For each constraint removed in turn, how many codes then satisfy the rest. Each must be > 1. */
  necessity: { clueId: ClueId; solutionsWithout: number }[];
  unique: boolean;
  allNecessary: boolean;
}

export type PatrolPoint = 'office' | 'corridor' | 'lift-lobby';

export interface ChimeState {
  point: PatrolPoint;
  /** 0 = start; increments per advance. Caught when advancing past the last point. */
  step: number;
  caught: boolean;
}

/** Public API of src/game/rules.ts (owner: rules agent). */
export interface RulesApi {
  /** Same seed => same puzzle. */
  createPuzzle(seed: string): Puzzle;
  /** Full six-digit attempt only. Never reveals the code. */
  submitCode(puzzle: Puzzle, attempt: string, found: ReadonlySet<ClueId>): SubmissionResult;
  /** Brute-forces 10^6 candidates. Synchronous; call after load or from the proof panel. */
  verifyPuzzle(puzzle: Puzzle): ProofReport;
  /** UTC daily seed, e.g. "2026-10-23". */
  dailySeed(date?: Date): string;
  freshSeed(): string;
}

/** Public API of src/game/chime.ts (owner: scene agent). Pure, no Phaser. */
export interface ChimeApi {
  initChime(): ChimeState;
  /** Move one patrol step. 'timer' and 'wrong-code' both advance. */
  advanceChime(state: ChimeState, reason: 'timer' | 'wrong-code'): ChimeState;
  /** True while Chime occupies the area containing this clue. */
  isClueLocked(state: ChimeState, clueId: ClueId): boolean;
  /** Elapsed-ms thresholds at which timer steps fire. Nothing before 30_000. */
  readonly TIMER_STEPS_MS: readonly number[];
}
