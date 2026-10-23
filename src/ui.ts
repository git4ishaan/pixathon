import Phaser from 'phaser';
import { PALETTE } from './config';

export function addMuteToggle(scene: Phaser.Scene, x: number, y: number): void {
  const label = scene.add.text(x, y, '', {
    color: '#f5e8c8',
    backgroundColor: '#17131f',
    fontFamily: 'Courier New, monospace',
    fontSize: '12px',
    padding: { x: 8, y: 7 },
  }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

  const syncLabel = (): void => {
    label.setText(scene.sound.mute ? 'SOUND OFF  [M]' : 'SOUND ON  [M]');
    label.setColor(scene.sound.mute ? '#8e8495' : '#f5e8c8');
  };
  const toggle = (): void => {
    scene.sound.setMute(!scene.sound.mute);
    syncLabel();
  };

  label.on('pointerover', () => label.setColor(`#${PALETTE.lamp.toString(16)}`));
  label.on('pointerout', syncLabel);
  label.on('pointerup', toggle);
  scene.input.keyboard?.on('keydown-M', toggle);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.keyboard?.off('keydown-M', toggle);
  });
  syncLabel();
}
