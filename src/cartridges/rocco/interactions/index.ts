import { InteractionRegistry, validateInteractionRules } from './interaction-registry';
import { createCoreInteractionRules } from './register-core-interactions';
import {
  createPierActionMenuRules,
  createPierSpecialSceneClickRules,
} from './register-pier-interactions';
import { createInventoryInteractionRules } from './register-inventory-interactions';
import { createDroppedInventoryInteractionRules } from './register-dropped-inventory-interactions';
import { createLevelInteractionRules } from './register-level-interactions';
import { createNetherSpecialSceneClickRules } from './register-nether-interactions';

export * from './interaction-types';
export * from './interaction-registry';
export * from './register-core-interactions';
export * from './register-pier-interactions';
export * from './register-inventory-interactions';
export * from './register-dropped-inventory-interactions';
export * from './register-level-interactions';
export * from './register-nether-interactions';

/**
 * Builds the default ROCCO interaction registry, registering every feature's
 * distributed rules and validating them so duplicate or ambiguous rules fail
 * during game load.
 */
export function createRoccoInteractionRegistry(): InteractionRegistry {
  const registry = new InteractionRegistry();
  registry.registerMany(createCoreInteractionRules());
  registry.registerMany(createPierActionMenuRules());
  registry.registerMany(createInventoryInteractionRules());
  registry.registerMany(createDroppedInventoryInteractionRules());
  registry.registerMany(createLevelInteractionRules());
  registry.registerManySpecial(createPierSpecialSceneClickRules());
  registry.registerManySpecial(createNetherSpecialSceneClickRules());
  validateInteractionRules(registry.getRules(), registry.getSpecialRules());
  return registry;
}
