import Phaser from 'phaser';

/**
 * Web Audio sound effects, no audio files. Each function takes the calling scene so it can
 * share Phaser's (user-unlocked) AudioContext and respect the mute toggle from ui.ts.
 */

type Wave = OscillatorType;

function context(scene: Phaser.Scene): AudioContext | null {
  const sound = scene.sound;
  if (sound.mute || !(sound instanceof Phaser.Sound.WebAudioSoundManager)) return null;
  if (sound.context.state === 'suspended') void sound.context.resume();
  return sound.context;
}

interface Tone {
  freq: number;
  /** Optional end frequency for a glide. */
  to?: number;
  start: number;
  dur: number;
  gain: number;
  wave: Wave;
}

function play(scene: Phaser.Scene, tones: Tone[]): void {
  const ctx = context(scene);
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const begin = t0 + tone.start;
    const end = begin + tone.dur;
    osc.type = tone.wave;
    osc.frequency.setValueAtTime(tone.freq, begin);
    if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
    amp.gain.setValueAtTime(0.0001, begin);
    amp.gain.exponentialRampToValueAtTime(tone.gain, begin + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(amp).connect(ctx.destination);
    osc.start(begin);
    osc.stop(end + 0.02);
  }
}

export function keyClick(scene: Phaser.Scene): void {
  play(scene, [{ freq: 880, start: 0, dur: 0.04, gain: 0.08, wave: 'square' }]);
}

export function wrongBuzz(scene: Phaser.Scene): void {
  play(scene, [
    { freq: 140, start: 0, dur: 0.18, gain: 0.12, wave: 'sawtooth' },
    { freq: 110, start: 0.2, dur: 0.22, gain: 0.12, wave: 'sawtooth' },
  ]);
}

/** Bellhop bell: Chime moving to the next patrol point. */
export function chimeBell(scene: Phaser.Scene): void {
  play(scene, [
    { freq: 1568, start: 0, dur: 0.6, gain: 0.1, wave: 'sine' },
    { freq: 2349, start: 0, dur: 0.4, gain: 0.05, wave: 'sine' },
  ]);
}

export function winJingle(scene: Phaser.Scene): void {
  const notes = [523, 659, 784, 1047];
  play(scene, notes.map((freq, i) => ({ freq, start: i * 0.12, dur: i === 3 ? 0.5 : 0.15, gain: 0.1, wave: 'triangle' })));
}

/** Jumpscare sting. Single descending burst, under 1 second, no flashing rhythm. */
export function scareSting(scene: Phaser.Scene): void {
  play(scene, [
    { freq: 900, to: 90, start: 0, dur: 0.8, gain: 0.18, wave: 'sawtooth' },
    { freq: 450, to: 45, start: 0, dur: 0.8, gain: 0.14, wave: 'square' },
  ]);
}
