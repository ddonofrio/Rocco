import type {
  RoccoAdvanceSequenceAction,
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridgeAction,
  RoccoCarryUseAction,
  RoccoSceneClickAction,
} from '../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../console/video/action-menu';
import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
} from '../../../console/video/grid-menu';
import type { RoccoLevel } from '../levels/rocco-level-types';
import type { RoccoInventory } from '../inventory';
import type { RoccoLocalization } from '../localization';
import type { RoccoPlayerAppearance } from '../rocco-player-appearance';
import type { RoccoDeveloperRuntimeController } from '../levels/runtime/rocco-developer-runtime-controller';
import type { RoccoDroppedInventoryController } from '../levels/runtime/rocco-dropped-inventory-controller';
import type {
  RoccoInventoryRuntimeController,
  RoccoInventoryRuntimeSceneClickResolution,
} from '../levels/runtime/rocco-inventory-runtime-controller';
import type { RoccoScriptedSequenceController } from '../levels/runtime/rocco-scripted-sequence-controller';
import type { RoccoLevelTransitionController } from '../levels/runtime/rocco-level-transition-controller';

export type InteractionKind =
  | 'scene-click'
  | 'action-menu'
  | 'grid-menu'
  | 'advance-sequence'
  | 'carry-use';
export type InteractionStage = 'default' | 'before-exit-intent';

/**
 * Frozen view of everything an interaction rule needs to decide and act.
 * Rules receive this instead of reaching into the central router, so the
 * router stops importing feature-specific scene or inventory IDs.
 */
export interface InteractionContext {
  readonly action: RoccoCartridgeAction;
  readonly cartridgeContext: CartridgeActionContext | undefined;
  readonly sdk: CartridgeSdkV1Runtime | null;
  readonly activeLevel: RoccoLevel | null;
  readonly inventory: RoccoInventory;
  readonly localization: RoccoLocalization;
  readonly getRoccoAppearance: () => RoccoPlayerAppearance;
  readonly setRoccoAppearance: (appearance: RoccoPlayerAppearance) => void;
  readonly isStanIdentified: () => boolean;
  readonly isStanAwake: () => boolean;
  readonly inventoryRuntime: RoccoInventoryRuntimeController;
  readonly droppedInventory: RoccoDroppedInventoryController;
  readonly developerRuntime: RoccoDeveloperRuntimeController;
  readonly scriptedSequences: RoccoScriptedSequenceController;
  readonly transitions: RoccoLevelTransitionController;
}

export type InteractionDisposition = CartridgeActionDisposition;

/**
 * Distributed interaction rule.
 *
 * `matches()` must be a cheap, side-effect-free predicate. `execute()` performs
 * the real work and may return `undefined` to mean "not consumed", preserving the
 * pre-refactor contract used by level fallbacks and menu-opening scene clicks.
 */
export interface InteractionRule {
  readonly id: string;
  readonly ownerId: string;
  readonly priority: number;
  readonly kind: InteractionKind;
  readonly stage?: InteractionStage;
  matches(context: InteractionContext): boolean;
  execute(context: InteractionContext, signal: AbortSignal): InteractionDisposition | undefined;
}

/**
 * Special carried-item scene-click rule, evaluated by the inventory runtime's
 * `handleSpecialSceneClick` sub-dispatch (e.g. using the lab coat on Rocco,
 * giving Stan the 20 EUR bill, defeating Stan with the keys, using the keys on
 * the bait shop door). Kept separate from {@link InteractionRule} because the
 * triggering context is a scene click plus a carried grid item.
 */
export interface SpecialInventorySceneClickRule {
  readonly id: string;
  readonly ownerId: string;
  readonly priority: number;
  matches(context: InteractionContext, carriedItem: RoccoGridMenuCarriedItem): boolean;
  execute(
    context: InteractionContext,
    carriedItem: RoccoGridMenuCarriedItem,
    signal: AbortSignal,
  ): RoccoInventoryRuntimeSceneClickResolution;
}

export class DuplicateInteractionRuleError extends Error {
  readonly ruleId: string;
  readonly ownerIds: readonly string[];

  constructor(ruleId: string, ownerIds: readonly string[]) {
    super(`Duplicate interaction rule '${ruleId}' registered by: ${ownerIds.join(', ')}.`);
    this.ruleId = ruleId;
    this.ownerIds = ownerIds;
    this.name = 'DuplicateInteractionRuleError';
  }
}

export function isSceneClickAction(action: RoccoCartridgeAction): action is RoccoSceneClickAction {
  return 'kind' in action && action.kind === 'scene-click';
}

export function isGridMenuAction(action: RoccoCartridgeAction): action is RoccoGridMenuActivation {
  return 'kind' in action && action.kind === 'grid-menu';
}

export function isAdvanceSequenceAction(
  action: RoccoCartridgeAction,
): action is RoccoAdvanceSequenceAction {
  return 'kind' in action && action.kind === 'advance-sequence';
}

export function isCarryUseAction(action: RoccoCartridgeAction): action is RoccoCarryUseAction {
  return 'kind' in action && action.kind === 'carry-use';
}

export function isActionMenuAction(
  action: RoccoCartridgeAction,
): action is RoccoActionMenuActivation {
  return !('kind' in action);
}

export function normalizeDisposition(
  result:
    | boolean
    | void
    | null
    | undefined
    | CartridgeActionDisposition
    | { suppressDefaultPlayerMove?: boolean },
): InteractionDisposition | undefined {
  if (result === undefined || result === null) {
    return undefined;
  }

  if (typeof result === 'boolean') {
    return result ? { consumed: true, defaultPlayerMovement: 'allow' } : undefined;
  }

  if ('defaultPlayerMovement' in result) {
    return result;
  }

  return {
    consumed: true,
    defaultPlayerMovement: result.suppressDefaultPlayerMove ? 'suppress' : 'allow',
  };
}

export function resolveInteractionKind(action: RoccoCartridgeAction): InteractionKind {
  if (isAdvanceSequenceAction(action)) {
    return 'advance-sequence';
  }

  if (isCarryUseAction(action)) {
    return 'carry-use';
  }

  if (isSceneClickAction(action)) {
    return 'scene-click';
  }

  if (isGridMenuAction(action)) {
    return 'grid-menu';
  }

  return 'action-menu';
}
