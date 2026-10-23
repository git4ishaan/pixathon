import Phaser from 'phaser';
import assetFiles from 'virtual:asset-list';
import { CLUE_IDS } from '../game/types';

/**
 * Optional art dropped into public/assets (no code change needed):
 *   room-bg.png, prop-<clueId>.png (8 ids), prop-<clueId>-glow.png, chime.png
 * Each loads as a texture keyed by the file name without .png. Missing files are skipped.
 */
const OPTIONAL_KEYS: readonly string[] = [
  'room-bg',
  ...CLUE_IDS.flatMap((id) => [`prop-${id}`, `prop-${id}-glow`]),
  'chime',
];

/** Ishaan's sprites and Mitansh's audio, keyed the way RoomScene looks them up. */
const IMAGES: Readonly<Record<string, string>> = {
  'prop-party-table': 'props/party-table.png',
  'prop-missing-poster': 'props/poster.png',
  'prop-service-panel': 'props/elevator.png',
  'prop-lobby-display': 'unsorted/arcade-cabinet.png',
  chime: 'mascots/chime.png',
};
const AUDIO: Readonly<Record<string, string>> = {
  'snd-ambient': 'audio/Ambientloop.wav',
  'snd-jumpscare': 'audio/Jumpscare.wav',
  'snd-radio': 'audio/Radio.wav',
  'snd-creak1': 'audio/Chimesmechcreek1.wav',
  'snd-creak2': 'audio/Chimesmechcreek2.wav',
  'snd-creak3': 'audio/Chimesmechcreek3.wav',
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const base = `${import.meta.env.BASE_URL}assets/`;
    for (const [key, file] of Object.entries(IMAGES)) this.load.image(key, base + file);
    for (const [key, file] of Object.entries(AUDIO)) this.load.audio(key, base + file);
    for (const key of OPTIONAL_KEYS) {
      if (!(key in IMAGES) && assetFiles.includes(`${key}.png`)) {
        this.load.image(key, `${import.meta.env.BASE_URL}assets/${key}.png`);
      }
    }
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
