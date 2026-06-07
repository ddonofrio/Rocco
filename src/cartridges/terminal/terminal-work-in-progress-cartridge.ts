import { defaultDisplayProfile } from '../../engine/video/display';
import type { RoccoCartridge, RoccoCartridgeContext } from '../../engine/cartridges/types';
import { installDefaultStarsEffect } from './terminal-work-in-progress-effects';
import { installDefaultSprite } from './terminal-work-in-progress-sprites';
import { terminalWorkInProgressCartridgeManifest } from './terminal-work-in-progress-manifest';
import { loadOrCreateDefaultScene } from './terminal-work-in-progress-scene';

export class RoccoTerminalWorkInProgressCartridge implements RoccoCartridge {
  readonly manifest = terminalWorkInProgressCartridgeManifest;

  async mount(context: RoccoCartridgeContext): Promise<void> {
    context.engine.video.display.setProfile(defaultDisplayProfile);
    const scene = await loadOrCreateDefaultScene(context.engine);

    context.engine.loadPlaneScene(scene);
    installDefaultStarsEffect(context.engine);
    installDefaultSprite(context.engine);
    context.engine.setStatus(
      `Cartridge: ${this.manifest.title} | Scene: ${scene.id} | effect: auto-scroll (stars)`,
    );
  }
}
