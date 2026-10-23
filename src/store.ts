/**
 * LAST LIFT — localStorage progress store.
 * Wraps all reads/writes in try/catch so private-browsing or storage-full
 * errors never crash the game.
 */

const KEY = 'last-lift-progress';

export interface Progress {
  /** Index of the next lore scene to show (0-based). */
  loreIndex: number;
  /** Number of completed attempts (wins + losses). */
  attempts: number;
}

const DEFAULT_PROGRESS: Progress = {
  loreIndex: 0,
  attempts: 0,
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } as Progress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function save(data: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full or private mode — silently ignore
  }
}

export const store = {
  get(): Progress {
    return load();
  },

  /** Call after a win or loss to advance the lore scene pointer. */
  recordAttempt(): Progress {
    const current = load();
    const next: Progress = {
      loreIndex: current.loreIndex + 1,
      attempts: current.attempts + 1,
    };
    save(next);
    return next;
  },

  /** Full reset — called on "Play Again" from the beginning. */
  reset(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
