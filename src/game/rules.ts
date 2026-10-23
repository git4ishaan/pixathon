/**
 * LAST LIFT — pure rule engine.
 * No Phaser, no DOM. Safe to import in scripts/validate.ts.
 *
 * THE SECRET — do NOT display this anywhere in the UI.
 */
export const SECRET = '3M5#76';

/** Characters allowed in a valid passcode. */
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*!';

export interface Rule {
  /** Unique rule identifier that matches an entry in clues.ts */
  id: string;
  /** The clue object that must be found before this rule appears on the keypad */
  clueId: string;
  /** Human-readable rule text shown on the keypad checklist */
  text: string;
  /** Returns true when the code satisfies this rule */
  check(code: string): boolean;
  /**
   * Optional: returns true while only the first N characters entered so far
   * already match this rule's prefix constraint.  Used for live green/red on
   * partial input.  When absent the rule is evaluated only on full-length codes.
   */
  prefixOk?(partial: string): boolean;
}

export const RULES: Rule[] = [
  {
    id: 'rule-length',
    clueId: 'party-table',
    text: 'Passcode is exactly 6 characters.',
    check: (code) => code.length === 6,
    prefixOk: (p) => p.length <= 6,
  },
  {
    id: 'rule-first-digit',
    clueId: 'lobby-statues',
    text: 'First character is the digit 3 (number of mascot statues).',
    check: (code) => code[0] === '3',
    prefixOk: (p) => p.length === 0 || p[0] === '3',
  },
  {
    id: 'rule-second-letter',
    clueId: 'missing-poster',
    text: "Second character is the letter M (Mia's initial).",
    check: (code) => code[1] === 'M',
    prefixOk: (p) => p.length <= 1 || p[1] === 'M',
  },
  {
    id: 'rule-last-digit',
    clueId: 'wall-calendar',
    text: 'Last character is 6 (the month Pocket Palace closed — June).',
    check: (code) => code.length === 6 && code[5] === '6',
    prefixOk: (p) => p.length < 6 || p[5] === '6',
  },
  {
    id: 'rule-fourth-hash',
    clueId: 'radio',
    text: 'Fourth character is # (three beats, then a hiss).',
    check: (code) => code[3] === '#',
    prefixOk: (p) => p.length <= 3 || p[3] === '#',
  },
  {
    id: 'rule-digit-sum',
    clueId: 'ticket-stub',
    text: 'The four digits in the passcode sum to 21.',
    check: (code) => {
      const digits = [...code].filter((c) => /\d/.test(c)).map(Number);
      return digits.length === 4 && digits.reduce((a, b) => a + b, 0) === 21;
    },
  },
  {
    id: 'rule-no-repeat',
    clueId: 'plaque',
    text: 'No character repeats ("No two children alike").',
    check: (code) => new Set(code).size === code.length,
    prefixOk: (p) => new Set(p).size === p.length,
  },
  {
    id: 'rule-flanking',
    clueId: 'elevator-panel',
    text: 'Characters on each side of # are 5 then 7 (buttons 5 and 7, lowest first).',
    check: (code) => code[2] === '5' && code[4] === '7',
    prefixOk: (p) => (p.length <= 2 || p[2] === '5') && (p.length <= 4 || p[4] === '7'),
  },
];

export interface EvaluationResult {
  /** True only when all rules pass */
  pass: boolean;
  /** Per-rule result */
  results: { rule: Rule; ok: boolean }[];
}

/**
 * Evaluate a code (or partial code) against all discovered rules.
 * @param code         The code typed so far.
 * @param foundClueIds Set of clue IDs the player has already discovered.
 */
export function evaluate(code: string, foundClueIds: Set<string>): EvaluationResult {
  const results = RULES.map((rule) => {
    // Rule is only tested if its clue has been found.
    if (!foundClueIds.has(rule.clueId)) return { rule, ok: false };
    const ok = code.length === 6 ? rule.check(code) : (rule.prefixOk?.(code) ?? false);
    return { rule, ok };
  });
  const pass = results.every((r) => r.ok) && code.length === 6;
  return { pass, results };
}

/** All characters in the allowed charset — for use by the validator. */
export { CHARSET };
