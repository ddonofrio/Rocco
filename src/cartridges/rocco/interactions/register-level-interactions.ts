import type { InteractionContext, InteractionRule } from './interaction-types';
import { normalizeDisposition } from './interaction-types';
import type { RoccoActionMenuActivation } from '../../../console/video/action-menu';
import type { RoccoSceneClickAction } from '../../../console/cartridges';
import type { RoccoGridMenuActivation, RoccoGridMenuCarriedItem } from '../../../console/video/grid-menu';
import type { RoccoLevel } from '../levels/rocco-level-types';

const LEVEL_PRIORITY = 0;
const ADVANCE_SEQUENCE_SCENE_CLICK: RoccoSceneClickAction = {
  kind: 'scene-click',
  sceneX: 0,
  sceneY: 0,
};

interface LevelInventorySceneClickHandler {
  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean;
}

function hasInventorySceneClickHandler(
  level: RoccoLevel,
): level is RoccoLevel & LevelInventorySceneClickHandler {
  return (
    'handleInventorySceneClick' in level &&
    typeof (level as Partial<LevelInventorySceneClickHandler>).handleInventorySceneClick === 'function'
  );
}

/**
 * Lowest-priority bridge rules that delegate to the active level's own
 * interaction handlers. Because every level owns its interactions, this is the
 * distributed fallback for each action kind (audit DOM-002).
 */
export function createLevelInteractionRules(): readonly InteractionRule[] {
  return [
    {
      id: 'level-action-menu',
      ownerId: 'level.action-menu',
      priority: LEVEL_PRIORITY,
      kind: 'action-menu',
      matches: () => true,
      execute: (context) => {
        context.activeLevel?.handleAction(context.action as RoccoActionMenuActivation);
        return normalizeDisposition(undefined);
      },
    },
    {
      id: 'level-scene-click',
      ownerId: 'level.scene-click',
      priority: LEVEL_PRIORITY,
      kind: 'scene-click',
      matches: () => true,
      execute: (context) => {
        return normalizeDisposition(
          context.activeLevel?.handleSceneClick?.(context.action as RoccoSceneClickAction),
        );
      },
    },
    {
      id: 'level-grid-menu',
      ownerId: 'level.grid-menu',
      priority: LEVEL_PRIORITY,
      kind: 'grid-menu',
      matches: () => true,
      execute: (context) => {
        context.activeLevel?.handleGridMenu?.(context.action as RoccoGridMenuActivation);
        return normalizeDisposition(undefined);
      },
    },
    {
      id: 'level-advance-sequence',
      ownerId: 'level.advance-sequence',
      priority: LEVEL_PRIORITY,
      kind: 'advance-sequence',
      matches: () => true,
      execute: (context) =>
        normalizeDisposition(
          context.activeLevel?.handleSceneClick?.(ADVANCE_SEQUENCE_SCENE_CLICK),
        ),
    },
  ];
}

/**
 * Shared helper for the carried-item scene-click bridge so it can invoke a
 * level's optional `handleInventorySceneClick` without the router importing
 * level-specific types.
 */
export function isLevelInventorySceneClick(
  context: InteractionContext,
  activation: RoccoSceneClickAction,
  carriedItem: RoccoGridMenuCarriedItem,
): boolean {
  const activeLevel = context.activeLevel;
  if (!activeLevel || !hasInventorySceneClickHandler(activeLevel)) {
    return false;
  }
  return activeLevel.handleInventorySceneClick(activation, carriedItem);
}
