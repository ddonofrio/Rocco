import type { RoccoEngine } from '../../engine/engine-api';
import type { RoccoFacingDirection, RoccoPoint } from '../../engine/video/sprites';
import {
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PAUSE_X,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_SPRITE_START_X,
  DEFAULT_WALK_MAP_ID,
  DEFAULT_SPRITE_Y_VALUES,
} from './rocco-default-constants';
import { createRoccoLocalization, type RoccoLocalization } from './localization';
import { createDefaultSpriteDefinition } from './rocco-default-sprite-definition';

const POSITION_EPSILON = 1;
const INTRO_THOUGHT_DURATION_MS = 6400;
const INTRO_HELP_DURATION_MS = 5400;

export interface RoccoDefaultSpriteController {
  update(deltaMs: number): void;
  isIntroActive(): boolean;
  cancelIntro(): void;
}

export interface RoccoDefaultSpriteInstallOptions {
  initialFacing?: RoccoFacingDirection;
  initialPosition?: RoccoPoint;
  localization?: RoccoLocalization;
  playIntro?: boolean;
}

class RoccoRunningSpriteController implements RoccoDefaultSpriteController {
  private readonly engine: RoccoEngine;
  private readonly options: RoccoDefaultSpriteInstallOptions;
  private readonly localization: RoccoLocalization;
  private phase: 'entering' | 'intro-thought' | 'intro-help' | 'idle' = 'entering';
  private elapsedMs = 0;

  constructor(engine: RoccoEngine, options: RoccoDefaultSpriteInstallOptions = {}) {
    this.engine = engine;
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
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

  cancelIntro(): void {
    if (!this.isIntroActive()) {
      return;
    }

    this.engine.video.messages.clearMessages();
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.elapsedMs = 0;
    this.startIdle('down');
  }

  private queueNextPass(): void {
    const startY = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;

    this.engine.video.sprites.setPosition(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_START_X,
      startY,
    );
    this.engine.video.sprites.moveTo(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_PAUSE_X, startY, {
      action: DEFAULT_SPRITE_RUN_ACTION_ID,
      stopDistance: 1,
    });
    this.engine.video.render(0);
    this.phase = 'entering';
    this.elapsedMs = 0;
  }

  private startIntroThought(): void {
    this.startIdle('up');
    this.engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.rocco.introThoughtLine,
      {
        ttlMs: INTRO_THOUGHT_DURATION_MS,
      },
    );
    this.engine.video.render(0);
    this.phase = 'intro-thought';
    this.elapsedMs = 0;
  }

  private startIntroHelp(): void {
    this.startIdle('down');
    this.engine.video.messages.say(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.rocco.introHelpLine,
      {
        ttlMs: INTRO_HELP_DURATION_MS,
      },
    );
    this.engine.video.render(0);
    this.phase = 'intro-help';
    this.elapsedMs = 0;
  }

  private finishIntro(): void {
    this.startIdle('down');
    this.phase = 'idle';
  }

  private startIdle(direction: RoccoFacingDirection): void {
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction,
        restart: true,
      },
    );
    this.engine.video.render(0);
    this.phase = 'idle';
  }

  private hasReachedCenter(): boolean {
    if (!this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return true;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return false;
    }

    return sprite.transform.x <= DEFAULT_SPRITE_PAUSE_X + POSITION_EPSILON;
  }
}

export async function installDefaultSprite(
  engine: RoccoEngine,
  options: RoccoDefaultSpriteInstallOptions = {},
): Promise<RoccoDefaultSpriteController> {
  const definition = createDefaultSpriteDefinition(
    options.localization ?? createRoccoLocalization(),
  );
  await engine.video.preloadSpriteDefinition(definition);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
  const initialPosition = options.initialPosition ?? {
    x: DEFAULT_SPRITE_START_X,
    y: DEFAULT_SPRITE_Y_VALUES[0] ?? 180,
  };

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_SPRITE_DEFINITION_ID, {
    id: DEFAULT_SPRITE_INSTANCE_ID,
    transform: {
      x: initialPosition.x,
      y: initialPosition.y,
      scaleX: DEFAULT_SPRITE_SCALE,
      scaleY: DEFAULT_SPRITE_SCALE,
      rotation: 0,
    },
    renderLayer: 'world.actors',
    zIndex: 60,
    depthMode: 'baseline-sort',
    interactive: true,
    collisionEnabled: true,
  });
  engine.video.sprites.bindToWalkMap(DEFAULT_SPRITE_INSTANCE_ID, {
    walkMapId: DEFAULT_WALK_MAP_ID,
    groundAnchor: {
      x: DEFAULT_SPRITE_GROUND_ANCHOR_X,
      y: DEFAULT_SPRITE_GROUND_ANCHOR_Y,
    },
    constrainMovement: true,
    followSurface: true,
  });
  engine.video.render(0);
  engine.setPlayerSprite(DEFAULT_SPRITE_INSTANCE_ID);

  const controller = new RoccoRunningSpriteController(engine, {
    ...options,
    playIntro: options.playIntro ?? !options.initialPosition,
  });
  controller.start();
  return controller;
}

export function uninstallDefaultSprite(engine: RoccoEngine): void {
  engine.setPlayerSprite(null);
  engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
  engine.video.render(0);
}
