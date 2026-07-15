import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridgeAction,
  RoccoSceneClickAction,
} from '../../../../console/cartridges';
import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoGridMenuCarriedItem } from '../../../../console/video/grid-menu';
import {
  createRoccoInteractionRegistry,
  type InteractionContext,
  type InteractionRegistry,
  isAdvanceSequenceAction,
  isSceneClickAction,
} from '../../interactions';
import type { RoccoInventory } from '../../inventory';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import type { RoccoPlayerAppearance } from '../../rocco-player-appearance';
import type { RoccoLevel } from '../rocco-level-types';
import type { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import type { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import type {
  RoccoInventoryRuntimeController,
  RoccoInventoryRuntimeSceneClickResolution,
} from './rocco-inventory-runtime-controller';
import type { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import type { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';

/**
 * Options for {@link RoccoSceneActionRouter}. The router no longer imports
 * feature-specific scene or inventory IDs; every interaction is resolved by the
 * distributed {@link InteractionRegistry} (audit DOM-002 / ROCCO-016).
 */
export interface RoccoSceneActionRouterOptions {
  localization?: RoccoLocalization;
  inventory: RoccoInventory;
  transitions: RoccoLevelTransitionController;
  inventoryRuntime: RoccoInventoryRuntimeController;
  droppedInventory: RoccoDroppedInventoryController;
  scriptedSequences: RoccoScriptedSequenceController;
  developerRuntime: RoccoDeveloperRuntimeController;
  registry?: InteractionRegistry;
  getEngine: () => RoccoEngine | null;
  getActiveLevel: () => RoccoLevel | null;
  getRoccoAppearance: () => RoccoPlayerAppearance;
  setRoccoAppearance: (appearance: RoccoPlayerAppearance) => void;
  isStanIdentified: () => boolean;
  isStanAwake: () => boolean;
}

/**
 * Thin dispatcher that builds an {@link InteractionContext} and delegates to
 * the distributed {@link InteractionRegistry}. The blocking-sequence guard,
 * pending bait shop door cancel, and exit-intent update remain here because
 * they are cartridge-runtime flow concerns rather than feature interactions.
 */
export class RoccoSceneActionRouter {
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoSceneActionRouterOptions;
  private readonly registry: InteractionRegistry;

  constructor(options: RoccoSceneActionRouterOptions) {
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
    this.registry = options.registry ?? createRoccoInteractionRegistry();
  }

  private buildContext(
    activation: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): InteractionContext {
    return {
      action: activation,
      cartridgeContext: context,
      engine: this.options.getEngine(),
      activeLevel: this.options.getActiveLevel(),
      inventory: this.options.inventory,
      localization: this.localization,
      getRoccoAppearance: this.options.getRoccoAppearance,
      setRoccoAppearance: this.options.setRoccoAppearance,
      isStanIdentified: this.options.isStanIdentified,
      isStanAwake: this.options.isStanAwake,
      inventoryRuntime: this.options.inventoryRuntime,
      droppedInventory: this.options.droppedInventory,
      developerRuntime: this.options.developerRuntime,
      scriptedSequences: this.options.scriptedSequences,
      transitions: this.options.transitions,
    };
  }

  private handleSceneClick(
    context: InteractionContext,
    signal: AbortSignal,
  ): CartridgeActionDisposition | void {
    if (!isSceneClickAction(context.action)) {
      return undefined;
    }

    const preExitIntent = this.registry.dispatchDetailed(context, signal, {
      kind: 'scene-click',
      stage: 'before-exit-intent',
    });
    if (preExitIntent.matched) {
      return preExitIntent.disposition;
    }

    this.options.transitions.updatePendingExitIntent(context.activeLevel, context.action);
    return this.registry.dispatch(context, signal);
  }

  handleAction(
    activation: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void {
    if (this.options.scriptedSequences.hasBlockingSequence() && !isAdvanceSequenceAction(activation)) {
      return {
        consumed: true,
        defaultPlayerMovement: 'suppress',
      };
    }

    const engine = this.options.getEngine();
    if (this.options.scriptedSequences.hasPendingBaitShopDoorUse()) {
      this.options.scriptedSequences.cancelPendingBaitShopDoorUse(engine);
    }

    const interactionContext = this.buildContext(activation, context);
    const signal = context?.signal ?? new AbortController().signal;

    if (isSceneClickAction(activation)) {
      return this.handleSceneClick(interactionContext, signal);
    }

    return this.registry.dispatch(interactionContext, signal);
  }

  handleSpecialInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): RoccoInventoryRuntimeSceneClickResolution {
    const context = this.buildContext(activation);
    return this.registry.dispatchSpecialInventorySceneClick(
      context,
      carriedItem,
      new AbortController().signal,
    );
  }
}