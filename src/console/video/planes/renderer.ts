import type { Container } from 'pixi.js';

import type { RoccoPlaneScene } from './types';

export interface RoccoPlaneRenderer {
  preloadScene(scene: RoccoPlaneScene): Promise<void>;
  mount(sceneId: string, container: Container): void;
  unmount(sceneId: string): void;
  sync(scene: RoccoPlaneScene): void;
  render(delta: number): void;
  destroy(): void;
}
