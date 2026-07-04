import type { RoccoEngine } from '../../../engine/engine-sdk';
import type { RoccoCartridgeActionResult } from '../../../engine/cartridges';
import type { RoccoPlaneScene } from '../../../engine/video/planes';
import { DEFAULT_DESIGN_HEIGHT, DEFAULT_DESIGN_WIDTH } from '../rocco-default-constants';
import type { RoccoLocalization } from '../localization';
import type { RoccoLevel, RoccoLevelConnector } from './rocco-level-types';

export const ROCCO_NETHER_PLACEHOLDER_LEVEL_ID = 'rocco-nether-placeholder';
export const ROCCO_NETHER_PLACEHOLDER_SCENE_ID = 'rocco-nether-placeholder-scene';

const ROCCO_NETHER_PLACEHOLDER_ENTRY_CONNECTOR_ID = 'entry';

const ROCCO_NETHER_PLACEHOLDER_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: ROCCO_NETHER_PLACEHOLDER_ENTRY_CONNECTOR_ID,
    entryPoint: {
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
    },
    entryFacing: 'down',
  },
] as const;

const ROCCO_NETHER_PLACEHOLDER_SCENE: RoccoPlaneScene = {
  id: ROCCO_NETHER_PLACEHOLDER_SCENE_ID,
  clearColor: '#000000',
  palettes: [],
  colorRegisterSets: [],
  attributeMaps: [],
  planes: [
    {
      id: 'rocco-nether-placeholder-backdrop',
      name: 'Nether Placeholder Backdrop',
      enabled: true,
      visible: true,
      source: {
        kind: 'solid',
        color: '#000000',
      },
      colorModel: { kind: 'native' },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      opacity: 1,
      priority: 0,
      renderLayer: 'background.back',
    },
  ],
};

export class RoccoNetherPlaceholderLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_PLACEHOLDER_LEVEL_ID;
  readonly title: string;
  readonly connectors = ROCCO_NETHER_PLACEHOLDER_CONNECTORS;

  constructor(localization: RoccoLocalization) {
    this.title = localization.locale === 'es' ? 'Nether' : 'Nether';
  }

  async mount(engine: RoccoEngine): Promise<RoccoPlaneScene> {
    // TODO: Replace this black placeholder with the real Nether level.
    await engine.video.preloadPlaneScene(ROCCO_NETHER_PLACEHOLDER_SCENE);
    engine.loadPlaneScene(ROCCO_NETHER_PLACEHOLDER_SCENE);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.render(0);
    return ROCCO_NETHER_PLACEHOLDER_SCENE;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.render(0);
  }

  update(): void {}

  handleAction(): void {}

  handleSceneClick(): RoccoCartridgeActionResult | void {}
}
