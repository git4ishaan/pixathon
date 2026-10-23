import Phaser from 'phaser';

/** Texture key TitleScene loads the menu art under. The room reuses it as its backdrop. */
const KEY = 'menu-background';

/**
 * The menu art, cropped from its right edge to the aspect ratio of the given area and scaled to
 * fit it. Returns undefined when the texture is missing, so callers fall back to a flat fill.
 */
export function roomBackdrop(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): Phaser.GameObjects.Image | undefined {
  if (!scene.textures.exists(KEY)) return undefined;
  const src = scene.textures.get(KEY).getSourceImage();
  const cropH = src.height;
  const cropW = Math.min(src.width, Math.round((cropH * w) / h));
  const scale = w / cropW;
  return scene.add
    .image(x - (src.width - cropW) * scale, y, KEY)
    .setOrigin(0)
    .setScale(scale)
    .setCrop(src.width - cropW, 0, cropW, cropH);
}
