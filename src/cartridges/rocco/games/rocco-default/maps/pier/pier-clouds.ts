import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { pierCloudAssetUrl } from './pier-assets';
import {
  DEFAULT_CLOUD_BASE_Y,
  DEFAULT_CLOUD_SCALE_GROWTH_FACTOR,
  DEFAULT_CLOUD_SPEED_X,
  DEFAULT_CLOUD_SPRITE_ANIMATION_ID,
  DEFAULT_CLOUD_SPRITE_DEFINITION_ID,
  DEFAULT_CLOUD_SPRITE_HEIGHT,
  DEFAULT_CLOUD_SPRITE_INSTANCE_ID,
  DEFAULT_CLOUD_SPRITE_OPACITY,
  DEFAULT_CLOUD_SPRITE_SCALE,
  DEFAULT_CLOUD_SPRITE_WIDTH,
  DEFAULT_CLOUD_START_X,
  DEFAULT_CLOUD_VERTICAL_AMPLITUDE,
  DEFAULT_CLOUD_VERTICAL_PERIOD_MS,
  DEFAULT_CLOUD_WRAP_RIGHT_X,
} from '../../constants';

export interface RoccoDefaultCloudController {
  update(deltaMs: number): void;
}

function createDefaultCloudSpriteDefinition(): RoccoSpriteDefinition {
  return {
    id: DEFAULT_CLOUD_SPRITE_DEFINITION_ID,
    name: 'Rocco Demo Cloud',
    images: [
      {
        id: 'rocco-cloud',
        uri: pierCloudAssetUrl,
        width: DEFAULT_CLOUD_SPRITE_WIDTH,
        height: DEFAULT_CLOUD_SPRITE_HEIGHT,
      },
    ],
    frames: [
      {
        id: 'cloud-idle',
        imageId: 'rocco-cloud',
        durationMs: 1000,
      },
    ],
    animations: {
      [DEFAULT_CLOUD_SPRITE_ANIMATION_ID]: {
        id: DEFAULT_CLOUD_SPRITE_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'cloud-idle', durationMs: 1000 }],
      },
    },
    defaultAnimation: DEFAULT_CLOUD_SPRITE_ANIMATION_ID,
    render: {
      renderLayer: 'world.behind',
      zIndex: 5,
      depthMode: 'fixed',
      opacity: DEFAULT_CLOUD_SPRITE_OPACITY,
    },
    bounds: {
      x: 0,
      y: 0,
      width: DEFAULT_CLOUD_SPRITE_WIDTH,
      height: DEFAULT_CLOUD_SPRITE_HEIGHT,
    },
    ignoreMessages: true,
    metadata: {
      purpose: 'default-rocco-cloud-demo',
    },
  };
}

class RoccoFloatingCloudController implements RoccoDefaultCloudController {
  private readonly engine: CartridgeSdkV1Runtime;
  private elapsedMs = 0;
  private x = DEFAULT_CLOUD_START_X;

  constructor(engine: CartridgeSdkV1Runtime) {
    this.engine = engine;
  }

  private applyPosition(): void {
    const phase = (this.elapsedMs / DEFAULT_CLOUD_VERTICAL_PERIOD_MS) * Math.PI * 2;
    const y = DEFAULT_CLOUD_BASE_Y + Math.sin(phase) * DEFAULT_CLOUD_VERTICAL_AMPLITUDE;
    const scale = this.resolveScale();
    this.engine.video.sprites.setScale(DEFAULT_CLOUD_SPRITE_INSTANCE_ID, scale, scale);
    this.engine.video.sprites.setPosition(DEFAULT_CLOUD_SPRITE_INSTANCE_ID, this.x, y);
  }

  private resolveScale(): number {
    const distance = DEFAULT_CLOUD_WRAP_RIGHT_X - DEFAULT_CLOUD_START_X;
    if (distance <= 0) {
      return DEFAULT_CLOUD_SPRITE_SCALE;
    }

    const progress = Math.min(1, Math.max(0, (this.x - DEFAULT_CLOUD_START_X) / distance));
    return DEFAULT_CLOUD_SPRITE_SCALE * (1 + progress * DEFAULT_CLOUD_SCALE_GROWTH_FACTOR);
  }

  start(): void {
    this.applyPosition();
  }

  update(deltaMs: number): void {
    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.elapsedMs += safeDeltaMs;
    this.x += DEFAULT_CLOUD_SPEED_X * (safeDeltaMs / 1000);

    if (this.x >= DEFAULT_CLOUD_WRAP_RIGHT_X) {
      this.x = DEFAULT_CLOUD_START_X;
    }

    this.applyPosition();
  }
}

export async function installDefaultCloud(
  engine: CartridgeSdkV1Runtime,
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultCloudController> {
  const definition = createDefaultCloudSpriteDefinition();
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_CLOUD_SPRITE_INSTANCE_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_CLOUD_SPRITE_DEFINITION_ID, {
    id: DEFAULT_CLOUD_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_CLOUD_START_X,
      y: DEFAULT_CLOUD_BASE_Y,
      scaleX: DEFAULT_CLOUD_SPRITE_SCALE,
      scaleY: DEFAULT_CLOUD_SPRITE_SCALE,
      rotation: 0,
    },
    renderLayer: 'world.behind',
    zIndex: 5,
    depthMode: 'fixed',
    opacity: DEFAULT_CLOUD_SPRITE_OPACITY,
    interactive: false,
    collisionEnabled: false,
  });

  const controller = new RoccoFloatingCloudController(engine);
  controller.start();
  return controller;
}

export function uninstallDefaultCloud(engine: CartridgeSdkV1Runtime): void {
  engine.video.sprites.removeSprite(DEFAULT_CLOUD_SPRITE_INSTANCE_ID);
}
