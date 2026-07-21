import type { CartridgeSdkV1Runtime } from '../../../../../console/cartridges/sdk-v1';
import type {
  RoccoSpriteAutoAdjustPerspectiveByY,
  RoccoSpriteDefinition,
} from '../../../../../console/video/sprites';
import type { RoccoFacingDirection, RoccoPoint } from '../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from './rocco-player-config';
import { createRoccoLocalization, type RoccoLocalization } from '../../../localization';
import { createRoccoPlayerSpriteDefinition } from './rocco-player-sprite-definition';
import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from './rocco-player-appearance';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../levels/rocco-level-runtime-ids';

const POSITION_EPSILON = 1;
const INTRO_THOUGHT_DURATION_MS = 6400;
const INTRO_HELP_DURATION_MS = 5400;
const DEFAULT_WALK_MAP_ID = ROCCO_ACTIVE_WALK_MAP_ID;

export interface RoccoPlayerSpriteController {
  update(deltaMs: number): void;
  isIntroActive(): boolean;
  isIntroSpeaking(): boolean;
  cancelIntro(): void;
  advanceIntro(): void;
}

export interface RoccoPlayerSpriteInstallOptions {
  appearance?: RoccoPlayerAppearance;
  initialFacing?: RoccoFacingDirection;
  initialPosition?: RoccoPoint;
  scale?: number;
  tint?: string;
  contrast?: number;
  localization?: RoccoLocalization;
  playIntro?: boolean;
  perspectiveAutoAdjust?: RoccoSpriteAutoAdjustPerspectiveByY;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createInstalledSpriteDefinition(
  localization: RoccoLocalization,
  options: RoccoPlayerSpriteInstallOptions,
): RoccoSpriteDefinition {
  const definition = createRoccoPlayerSpriteDefinition(localization, {
    appearance: options.appearance ?? DEFAULT_ROCCO_PLAYER_APPEARANCE,
  });
  if (!options.perspectiveAutoAdjust) {
    return definition;
  }

  const customized = clone(definition);
  customized.autoAdjust = {
    ...customized.autoAdjust,
    enabled: customized.autoAdjust?.enabled ?? true,
    perspectiveByY: clone(options.perspectiveAutoAdjust),
  };
  return customized;
}

export function createRoccoAppearanceSpriteDefinition(
  engine: CartridgeSdkV1Runtime,
  appearance: RoccoPlayerAppearance,
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  const currentDefinition = engine.video.sprites.getSpriteDefinition(
    ROCCO_PLAYER_CONFIG.ids.definition,
  );
  return createInstalledSpriteDefinition(localization, {
    appearance,
    perspectiveAutoAdjust: currentDefinition?.autoAdjust?.perspectiveByY,
  });
}

export function applyRoccoPlayerAppearance(
  engine: CartridgeSdkV1Runtime,
  appearance: RoccoPlayerAppearance,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  const definition = createRoccoAppearanceSpriteDefinition(engine, appearance, localization);
  engine.video.sprites.loadSpriteDefinition(definition);
  void engine.video
    .preloadSpriteDefinition(definition)
    .then(() => {
      engine.video.sprites.loadSpriteDefinition(definition);
    })
    .catch(() => {
      engine.log('Assets', 'Rocco appearance assets could not be preloaded.');
    });
}

class RoccoRunningSpriteController implements RoccoPlayerSpriteController {
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly options: RoccoPlayerSpriteInstallOptions;
  private readonly localization: RoccoLocalization;
  private phase: 'entering' | 'intro-thought' | 'intro-help' | 'idle' = 'entering';
  private elapsedMs = 0;

  constructor(engine: CartridgeSdkV1Runtime, options: RoccoPlayerSpriteInstallOptions = {}) {
    this.engine = engine;
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
  }

  private queueNextPass(): void {
    const startY = ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180;

    this.engine.video.sprites.setPosition(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.placement.startX,
      startY,
    );
    this.engine.video.sprites.moveTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.placement.pauseX,
      startY,
      {
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        stopDistance: 1,
      },
    );
    this.phase = 'entering';
    this.elapsedMs = 0;
  }

  private startIntroThought(): void {
    this.startIdle('up');
    this.engine.video.messages.think(
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.localization.text.rocco.introThoughtLine,
      {
        ttlMs: INTRO_THOUGHT_DURATION_MS,
        background: true,
      },
    );
    this.phase = 'intro-thought';
    this.elapsedMs = 0;
  }

  private startIntroHelp(): void {
    this.startIdle('down');
    this.engine.video.messages.say(
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.localization.text.rocco.introHelpLine,
      {
        ttlMs: INTRO_HELP_DURATION_MS,
        background: true,
      },
    );
    this.phase = 'intro-help';
    this.elapsedMs = 0;
  }

  private finishIntro(): void {
    this.startIdle('down');
    this.phase = 'idle';
  }

  private startIdle(direction: RoccoFacingDirection): void {
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction,
        restart: true,
      },
    );
    this.phase = 'idle';
  }

  private hasReachedCenter(): boolean {
    if (!this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return true;
    }

    const sprite = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    if (!sprite) {
      return false;
    }

    return sprite.transform.x <= ROCCO_PLAYER_CONFIG.placement.pauseX + POSITION_EPSILON;
  }

  start(): void {
    if (this.options.playIntro === false) {
      this.startIdle(this.options.initialFacing ?? 'down');
      return;
    }

    this.queueNextPass();
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    if (this.phase === 'entering' && this.hasReachedCenter()) {
      this.startIntroThought();
      return;
    }

    if (this.phase === 'intro-thought') {
      this.elapsedMs += deltaMs;
      if (this.elapsedMs >= INTRO_THOUGHT_DURATION_MS) {
        this.startIntroHelp();
      }
      return;
    }

    if (this.phase === 'intro-help') {
      this.elapsedMs += deltaMs;
      if (this.elapsedMs >= INTRO_HELP_DURATION_MS) {
        this.finishIntro();
      }
    }
  }

  isIntroActive(): boolean {
    return this.phase !== 'idle';
  }

  isIntroSpeaking(): boolean {
    return this.phase === 'intro-thought' || this.phase === 'intro-help';
  }

  advanceIntro(): void {
    if (this.phase === 'intro-thought') {
      this.startIntroHelp();
      return;
    }

    if (this.phase === 'intro-help') {
      this.finishIntro();
      this.engine.video.messages.clearMessages();
    }
  }

  cancelIntro(): void {
    if (!this.isIntroActive()) {
      return;
    }

    this.engine.video.messages.clearMessages();
    this.engine.video.sprites.stopMovement(ROCCO_PLAYER_CONFIG.ids.instance);
    this.elapsedMs = 0;
    this.startIdle('down');
  }
}

export async function installRoccoPlayerSprite(
  engine: CartridgeSdkV1Runtime,
  options: RoccoPlayerSpriteInstallOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoPlayerSpriteController> {
  const localization = options.localization ?? createRoccoLocalization();
  const definition = createInstalledSpriteDefinition(localization, options);
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(ROCCO_PLAYER_CONFIG.ids.instance);
  const scale = options.scale ?? ROCCO_PLAYER_CONFIG.motion.scale;
  const initialPosition = options.initialPosition ?? {
    x: ROCCO_PLAYER_CONFIG.placement.startX,
    y: ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
  };

  engine.video.sprites.createSpriteFromDefinition(ROCCO_PLAYER_CONFIG.ids.definition, {
    id: ROCCO_PLAYER_CONFIG.ids.instance,
    transform: {
      x: initialPosition.x,
      y: initialPosition.y,
      scaleX: scale,
      scaleY: scale,
      rotation: 0,
    },
    renderLayer: 'world.actors',
    zIndex: 60,
    depthMode: 'baseline-sort',
    interactive: true,
    collisionEnabled: true,
    tint: options.tint,
    contrast: options.contrast,
  });
  engine.video.sprites.bindToWalkMap(ROCCO_PLAYER_CONFIG.ids.instance, {
    walkMapId: DEFAULT_WALK_MAP_ID,
    groundAnchor: {
      x: ROCCO_PLAYER_CONFIG.frame.groundAnchor.x,
      y: ROCCO_PLAYER_CONFIG.frame.groundAnchor.y,
    },
    constrainMovement: true,
    followSurface: true,
  });
  engine.setPlayerSprite(ROCCO_PLAYER_CONFIG.ids.instance);

  const controller = new RoccoRunningSpriteController(engine, {
    ...options,
    localization,
    playIntro: options.playIntro ?? !options.initialPosition,
  });
  controller.start();
  return controller;
}

export function uninstallRoccoPlayerSprite(engine: CartridgeSdkV1Runtime): void {
  engine.setPlayerSprite(undefined);
  engine.video.sprites.removeSprite(ROCCO_PLAYER_CONFIG.ids.instance);
}
