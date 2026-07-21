import type { RoccoSceneClickAction } from '../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../console/cartridges/sdk-v1';
import type { InputPolicyLease } from '../../console/input/input-policy-stack';
import type { RoccoFacingDirection, RoccoPoint } from '../../console/video/sprites';
import { ROCCO_PLAYER_CONFIG } from './games/rocco-default/player/rocco-player-config';

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
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly definitions = new Map<string, RoccoScriptedSceneInteractionDefinition>();
  private activeInteraction: RoccoActiveScriptedSceneInteraction | undefined = undefined;
  private inputLease: InputPolicyLease | undefined = undefined;

  constructor(
    engine: CartridgeSdkV1Runtime,
    definitions: readonly RoccoScriptedSceneInteractionDefinition[],
  ) {
    this.engine = engine;
    for (const definition of definitions) {
      this.definitions.set(definition.targetInstanceId, definition);
    }
  }

  private releaseInputLease(): void {
    this.inputLease?.dispose();
    this.inputLease = undefined;
  }

  private start(definition: RoccoScriptedSceneInteractionDefinition): void {
    if (!this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return;
    }

    this.activeInteraction = { definition };
    this.inputLease = this.engine.acquireInputLease('scripted-scene-interaction', 'blocked');
    const isStarted = this.engine.video.sprites.goTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      definition.moveTo.x,
      definition.moveTo.y,
      {
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        constrainToWalkMap: definition.constrainToWalkMap,
        idleAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      this.activeInteraction = undefined;
      this.releaseInputLease();
    }
  }

  handleSceneClick(activation: RoccoSceneClickAction): boolean {
    if (
      this.engine.getInputMode() !== 'interactive' ||
      this.activeInteraction ||
      !activation.targetInstanceId
    ) {
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

    if (!this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance)) {
      this.cancel();
      return;
    }

    if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return;
    }

    const { definition } = this.activeInteraction;
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction: definition.facing,
        restart: true,
      },
    );
    try {
      definition.onReached();
    } finally {
      if (definition.restoreInputOnComplete !== false) {
        this.releaseInputLease();
      }
      this.activeInteraction = undefined;
    }
  }

  hasTarget(targetInstanceId: string | null | undefined): boolean {
    if (!targetInstanceId) {
      return false;
    }

    return this.definitions.has(targetInstanceId);
  }

  cancel(): void {
    if (!this.activeInteraction && !this.inputLease) {
      return;
    }

    this.activeInteraction = undefined;
    this.releaseInputLease();
  }

  run(definition: RoccoScriptedSceneInteractionDefinition): boolean {
    if (this.engine.getInputMode() !== 'interactive' || this.activeInteraction) {
      return false;
    }

    this.start(definition);
    return true;
  }
}
