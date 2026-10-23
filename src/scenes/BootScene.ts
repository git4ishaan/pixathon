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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const key of OPTIONAL_KEYS) {
      if (assetFiles.includes(`${key}.png`)) {
        this.load.image(key, `${import.meta.env.BASE_URL}assets/${key}.png`);
      }
    }
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
