import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { pierCloudAssetUrl } from './pier-cloud-assets';
import { PIER_CLOUD_CONFIG } from './pier-cloud-config';

export interface RoccoDefaultCloudController {
  update(deltaMs: number): void;
}

function createDefaultCloudSpriteDefinition(): RoccoSpriteDefinition {
  return {
    id: PIER_CLOUD_CONFIG.definitionId,
    name: 'Rocco Demo Cloud',
    images: [
      {
        id: 'rocco-cloud',
        uri: pierCloudAssetUrl,
        width: PIER_CLOUD_CONFIG.spriteWidth,
        height: PIER_CLOUD_CONFIG.spriteHeight,
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
      [PIER_CLOUD_CONFIG.animationId]: {
        id: PIER_CLOUD_CONFIG.animationId,
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'cloud-idle', durationMs: 1000 }],
      },
    },
    defaultAnimation: PIER_CLOUD_CONFIG.animationId,
    render: {
      renderLayer: 'world.behind',
      zIndex: 5,
      depthMode: 'fixed',
      opacity: PIER_CLOUD_CONFIG.opacity,
    },
    bounds: {
      x: 0,
      y: 0,
      width: PIER_CLOUD_CONFIG.spriteWidth,
      height: PIER_CLOUD_CONFIG.spriteHeight,
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
  private x = PIER_CLOUD_CONFIG.startX;

  constructor(engine: CartridgeSdkV1Runtime) {
    this.engine = engine;
  }

  private applyPosition(): void {
    const phase = (this.elapsedMs / PIER_CLOUD_CONFIG.verticalPeriodMs) * Math.PI * 2;
    const y = PIER_CLOUD_CONFIG.baseY + Math.sin(phase) * PIER_CLOUD_CONFIG.verticalAmplitude;
    const scale = this.resolveScale();
    this.engine.video.sprites.setScale(PIER_CLOUD_CONFIG.instanceId, scale, scale);
    this.engine.video.sprites.setPosition(PIER_CLOUD_CONFIG.instanceId, this.x, y);
  }

  private resolveScale(): number {
    const distance = PIER_CLOUD_CONFIG.wrapRightX - PIER_CLOUD_CONFIG.startX;
    if (distance <= 0) {
      return PIER_CLOUD_CONFIG.scale;
    }

    const progress = Math.min(1, Math.max(0, (this.x - PIER_CLOUD_CONFIG.startX) / distance));
    return PIER_CLOUD_CONFIG.scale * (1 + progress * PIER_CLOUD_CONFIG.scaleGrowthFactor);
  }

  start(): void {
    this.applyPosition();
  }

  update(deltaMs: number): void {
    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.elapsedMs += safeDeltaMs;
    this.x += PIER_CLOUD_CONFIG.speedX * (safeDeltaMs / 1000);

    if (this.x >= PIER_CLOUD_CONFIG.wrapRightX) {
      this.x = PIER_CLOUD_CONFIG.startX;
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
  engine.video.sprites.removeSprite(PIER_CLOUD_CONFIG.instanceId);

  engine.video.sprites.createSpriteFromDefinition(PIER_CLOUD_CONFIG.definitionId, {
    id: PIER_CLOUD_CONFIG.instanceId,
    transform: {
      x: PIER_CLOUD_CONFIG.startX,
      y: PIER_CLOUD_CONFIG.baseY,
      scaleX: PIER_CLOUD_CONFIG.scale,
      scaleY: PIER_CLOUD_CONFIG.scale,
      rotation: 0,
    },
    renderLayer: 'world.behind',
    zIndex: 5,
    depthMode: 'fixed',
    opacity: PIER_CLOUD_CONFIG.opacity,
    interactive: false,
    collisionEnabled: false,
  });

  const controller = new RoccoFloatingCloudController(engine);
  controller.start();
  return controller;
}

export function uninstallDefaultCloud(engine: CartridgeSdkV1Runtime): void {
  engine.video.sprites.removeSprite(PIER_CLOUD_CONFIG.instanceId);
}
