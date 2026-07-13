import type { RoccoSceneClickAction } from '../../console/cartridges';
import type { RoccoEngine } from '../../console/engine-sdk';
import type { InputPolicyLease } from '../../console/input/input-policy-stack';
import type { RoccoFacingDirection, RoccoPoint } from '../../console/video/sprites';
import {
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
} from './rocco-default-constants';

export interface RoccoScriptedSceneInteractionDefinition {
  targetInstanceId: string;
  moveTo: RoccoPoint;
  facing: RoccoFacingDirection;
  onReached: () => void;
  constrainToWalkMap?: boolean;
  restoreInputOnComplete?: boolean;
}

interface RoccoActiveScriptedSceneInteraction {
  definition: RoccoScriptedSceneInteractionDefinition;
}

export class RoccoScriptedSceneInteractionController {
  private readonly engine: RoccoEngine;
  private readonly definitions = new Map<string, RoccoScriptedSceneInteractionDefinition>();
  private activeInteraction: RoccoActiveScriptedSceneInteraction | null = null;
  private inputLease: InputPolicyLease | null = null;

  constructor(
    engine: RoccoEngine,
    definitions: readonly RoccoScriptedSceneInteractionDefinition[],
  ) {
    this.engine = engine;
    for (const definition of definitions) {
      this.definitions.set(definition.targetInstanceId, definition);
    }
  }

  handleSceneClick(activation: RoccoSceneClickAction): boolean {
    if (this.engine.getInputMode() !== 'interactive' || this.activeInteraction || !activation.targetInstanceId) {
      return false;
    }

    const definition = this.definitions.get(activation.targetInstanceId);
    if (!definition) {
      return false;
    }

    return this.run(definition);
  }

  update(): void {
    if (!this.activeInteraction) {
      return;
    }

    if (!this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      this.cancel();
      return;
    }

    if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    const { definition } = this.activeInteraction;
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction: definition.facing,
        restart: true,
      },
    );
    try {
      definition.onReached();
    } finally {
      if (definition.restoreInputOnComplete !== false) {
        this.inputLease?.dispose();
        this.inputLease = null;
      }
      this.activeInteraction = null;
    }
    this.engine.video.render(0);
  }

  hasTarget(targetInstanceId: string | null | undefined): boolean {
    if (!targetInstanceId) {
      return false;
    }

    return this.definitions.has(targetInstanceId);
  }

  cancel(): void {
    if (!this.activeInteraction) {
      return;
    }

    this.activeInteraction = null;
    this.inputLease?.dispose();
    this.inputLease = null;
  }

  run(definition: RoccoScriptedSceneInteractionDefinition): boolean {
    if (this.engine.getInputMode() !== 'interactive' || this.activeInteraction) {
      return false;
    }

    this.start(definition);
    return true;
  }

  private start(definition: RoccoScriptedSceneInteractionDefinition): void {
    if (!this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    this.activeInteraction = { definition };
    this.inputLease = this.engine.acquireInputLease('scripted-scene-interaction', 'blocked');
    const started = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      definition.moveTo.x,
      definition.moveTo.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        constrainToWalkMap: definition.constrainToWalkMap,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!started) {
      this.activeInteraction = null;
      this.inputLease.dispose();
      this.inputLease = null;
    }
    this.engine.video.render(0);
  }
}
