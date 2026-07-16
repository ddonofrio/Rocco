import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
  RoccoActionMenuItem,
  RoccoActionMenuRenderable,
  RoccoActionMenuState,
  RoccoActionMenuSystem,
} from './types';

const DEFAULT_ORBIT_RADIUS = 54;
const DEFAULT_ORBIT_SPEED_RADIANS_PER_SECOND = 0.35;
const DEFAULT_ITEM_SIZE = 44;
const DEFAULT_HOVER_SCALE = 1.14;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeDefinition(definition: RoccoActionMenuDefinition): RoccoActionMenuDefinition {
  return {
    ...clone(definition),
    renderLayer: definition.renderLayer ?? 'ui.action-menu',
    orbitRadius: definition.orbitRadius ?? DEFAULT_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond:
      definition.orbitSpeedRadiansPerSecond ?? DEFAULT_ORBIT_SPEED_RADIANS_PER_SECOND,
    itemSize: definition.itemSize ?? DEFAULT_ITEM_SIZE,
    hoverScale: definition.hoverScale ?? DEFAULT_HOVER_SCALE,
    circleFill: definition.circleFill ?? '#0f1610',
    circleStroke: definition.circleStroke ?? '#d7e6c5',
    circleStrokeWidth: definition.circleStrokeWidth ?? 2,
  };
}

export class RoccoActionMenuSystemSDK implements RoccoActionMenuSystem {
  private readonly definitions = new Map<string, RoccoActionMenuDefinition>();
  private activeState: RoccoActionMenuState | undefined;

  private adjustMenuPosition(
    definition: RoccoActionMenuDefinition,
    x: number,
    y: number,
  ): { x: number; y: number } {
    const DESIGN_WIDTH = 960;
    const DESIGN_HEIGHT = 540;

    const orbitRadius = definition.orbitRadius ?? DEFAULT_ORBIT_RADIUS;
    const itemSize = definition.itemSize ?? DEFAULT_ITEM_SIZE;
    const hoverScale = definition.hoverScale ?? DEFAULT_HOVER_SCALE;

    // Calculate the maximum distance an item can be from the center
    // This is the orbit radius plus half the item size (scaled for hover)
    const maxDistance = orbitRadius + (itemSize * hoverScale) / 2;

    // Clamp the menu center position to keep all items within screen bounds
    const clampedX = Math.max(maxDistance, Math.min(x, DESIGN_WIDTH - maxDistance));
    const clampedY = Math.max(maxDistance, Math.min(y, DESIGN_HEIGHT - maxDistance));

    return { x: clampedX, y: clampedY };
  }

  private findMenuForTarget(
    targetInstanceId: string,
    targetDefinitionId: string,
  ): RoccoActionMenuDefinition | undefined {
    for (const definition of this.definitions.values()) {
      if (definition.targetInstanceIds?.includes(targetInstanceId)) {
        return definition;
      }
      if (definition.targetDefinitionIds?.includes(targetDefinitionId)) {
        return definition;
      }
    }

    return undefined;
  }

  private findItemAt(
    definition: RoccoActionMenuDefinition,
    state: RoccoActionMenuState,
    x: number,
    y: number,
  ): RoccoActionMenuItem | undefined {
    const itemSize = definition.itemSize ?? DEFAULT_ITEM_SIZE;
    const hitRadius = (itemSize * (definition.hoverScale ?? DEFAULT_HOVER_SCALE)) / 2;
    const hitRadiusSquared = hitRadius * hitRadius;

    for (let index = definition.items.length - 1; index >= 0; index -= 1) {
      const position = this.resolveItemPosition(definition, state, index);
      const dx = x - position.x;
      const dy = y - position.y;
      if (dx * dx + dy * dy <= hitRadiusSquared) {
        return definition.items[index];
      }
    }

    return undefined;
  }

  private resolveItemPosition(
    definition: RoccoActionMenuDefinition,
    state: RoccoActionMenuState,
    index: number,
  ): { x: number; y: number } {
    const count = Math.max(1, definition.items.length);
    const radius = definition.orbitRadius ?? DEFAULT_ORBIT_RADIUS;
    const speed = definition.orbitSpeedRadiansPerSecond ?? DEFAULT_ORBIT_SPEED_RADIANS_PER_SECOND;
    const elapsedSeconds = state.elapsedMs / 1000;
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2 + elapsedSeconds * speed;
    return {
      x: state.x + Math.cos(angle) * radius,
      y: state.y + Math.sin(angle) * radius,
    };
  }

  registerMenu(definition: RoccoActionMenuDefinition): void {
    if (!definition.id) {
      throw new Error('Action menu definition id is required.');
    }
    if (definition.items.length === 0) {
      throw new Error(`Action menu definition '${definition.id}' must include at least one item.`);
    }

    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate action menu registration '${definition.id}'.`);
    }

    this.definitions.set(definition.id, normalizeDefinition(definition));
  }

  unregisterMenu(definitionId: string): void {
    this.definitions.delete(definitionId);
    if (this.activeState?.definitionId === definitionId) {
      this.activeState = undefined;
    }
  }

  listMenus(): RoccoActionMenuDefinition[] {
    return this.definitions.values().map((definition) => clone(definition)).toArray();
  }

  openMenuForTarget(targetInstanceId: string, targetDefinitionId: string, x: number, y: number): boolean {
    const definition = this.findMenuForTarget(targetInstanceId, targetDefinitionId);
    if (!definition) {
      return false;
    }

    const adjustedPosition = this.adjustMenuPosition(definition, x, y);

    this.activeState = {
      definitionId: definition.id,
      targetInstanceId,
      targetDefinitionId,
      x: adjustedPosition.x,
      y: adjustedPosition.y,
      elapsedMs: 0,
      hoveredItemId: undefined,
    };
    return true;
  }

  closeMenu(): void {
    this.activeState = undefined;
  }

  isOpen(): boolean {
    return this.activeState !== undefined;
  }

  setHoverAt(x: number, y: number): boolean {
    const state = this.activeState;
    const definition = state ? this.definitions.get(state.definitionId) : undefined;
    if (!state || !definition) {
      return false;
    }

    const hoveredItem = this.findItemAt(definition, state, x, y);
    const nextHoveredItemId = hoveredItem?.id;
    if (state.hoveredItemId === nextHoveredItemId) {
      return false;
    }

    state.hoveredItemId = nextHoveredItemId;
    return true;
  }

  getHoveredItem(): RoccoActionMenuItem | undefined {
    const state = this.activeState;
    const definition = state ? this.definitions.get(state.definitionId) : undefined;
    if (!state?.hoveredItemId || !definition) {
      return undefined;
    }

    const item = definition.items.find((candidate) => candidate.id === state.hoveredItemId);
    return item ? clone(item) : undefined;
  }

  activateAt(x: number, y: number): RoccoActionMenuActivation | undefined {
    const state = this.activeState;
    const definition = state ? this.definitions.get(state.definitionId) : undefined;
    if (!state || !definition) {
      return undefined;
    }

    const item = this.findItemAt(definition, state, x, y);
    if (!item) {
      this.closeMenu();
      return undefined;
    }

    const activation: RoccoActionMenuActivation = {
      definitionId: definition.id,
      targetInstanceId: state.targetInstanceId,
      targetDefinitionId: state.targetDefinitionId,
      itemId: item.id,
      actionId: item.actionId,
    };
    this.closeMenu();
    return activation;
  }

  getRenderableMenu(): RoccoActionMenuRenderable | undefined {
    const state = this.activeState;
    const definition = state ? this.definitions.get(state.definitionId) : undefined;
    if (!state || !definition) {
      return undefined;
    }

    return {
      definition: clone(definition),
      state: clone(state),
    };
  }

  update(deltaMs: number): void {
    if (!this.activeState || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    this.activeState.elapsedMs += deltaMs;
  }

}
