'use strict';
/* audio.js: tiny Web Audio sound effects. No files needed.
   Usage: Sfx.move(), Sfx.blocked(), Sfx.undo(), Sfx.win(), Sfx.toggleMute()
   Browsers start audio only after a user gesture; the first click/keypress unlocks it. */
const Sfx = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One blip: frequency, duration (s), wave type, volume, optional start delay and glide target.
  function tone(freq, dur, type = 'square', vol = 0.06, delay = 0, glideTo = null) {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    move()    { tone(440, 0.06, 'square', 0.05, 0, 520); },
    blocked() { tone(120, 0.12, 'sawtooth', 0.07, 0, 80); },
    undo()    { tone(520, 0.08, 'triangle', 0.06, 0, 330); },
    hint()    { tone(660, 0.08, 'sine', 0.06); tone(880, 0.08, 'sine', 0.06, 0.09); },
    win()     { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.06, i * 0.1)); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; }
  };
})();
