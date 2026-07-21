import { describe, expect, it } from 'vitest';

import type { ConsoleKernel } from '../../../../src/console/console-kernel';
import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import type { RoccoSceneClickAction } from '../../../../src/console/cartridges';
import type { RoccoGridMenuCarriedItem } from '../../../../src/console/video/grid-menu';
import type { InteractionContext } from '../../../../src/cartridges/rocco/interactions/interaction-types';
import { createNetherSpecialSceneClickRules } from '../../../../src/cartridges/rocco/interactions/register-nether-interactions';
import { ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID } from '../../../../src/cartridges/rocco/inventory/rocco-inventory';
import { ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/levels';
import { RoccoInventory } from '../../../../src/cartridges/rocco/inventory/rocco-inventory';
import { createRoccoTwentyEurosInventoryItem } from '../../../../src/cartridges/rocco/inventory/rocco-inventory';
import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';

const spanishRoccoLocalization = createRoccoLocalization('es');

const NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-security-camera-instance';
const NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-security-camera-target';
const NETHER_INVENTORY_MENU_ID = 'rocco-inventory-menu';

interface FakeEngineState {
  clearedCarriedItem: boolean;
}

function createEngineMock(state: FakeEngineState): CartridgeSdkV1Runtime {
  return {
    video: {
      gridMenus: {
        openMenu() {},
        toggleMenu() {},
        closeMenu() {},
        isOpen() {
          return false;
        },
        setHoverAt() {
          return false;
        },
        getHoveredItem() {
          return;
        },
        activateAt() {},
        getCarriedItem() {
          return;
        },
        clearCarriedItem() {
          state.clearedCarriedItem = true;
        },
        getRenderableMenu() {
          return;
        },
      },
    },
  } as unknown as ConsoleKernel as unknown as CartridgeSdkV1Runtime;
}

interface NetherCapabilityLevel {
  readonly id: string;
  isSecurityCameraTarget(targetInstanceId: string | undefined): boolean;
  beginSecurityCameraBribeSequence(): boolean;
}

function createCameraCapabilityLevel(
  shouldBeginBribe: boolean,
): NetherCapabilityLevel & { beginCalls: number } {
  let beginCalls = 0;
  return {
    id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
    isSecurityCameraTarget(targetInstanceId: string | undefined): boolean {
      return (
        targetInstanceId === NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID ||
        targetInstanceId === NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID
      );
    },
    beginSecurityCameraBribeSequence(): boolean {
      beginCalls += 1;
      return shouldBeginBribe;
    },
    get beginCalls() {
      return beginCalls;
    },
  };
}

function createCarriedTwentyEuros(): RoccoGridMenuCarriedItem {
  return {
    definitionId: NETHER_INVENTORY_MENU_ID,
    item: {
      id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
      label: '20 €',
    },
  };
}

function createSceneClickAction(targetInstanceId: string): RoccoSceneClickAction {
  return {
    kind: 'scene-click',
    targetInstanceId,
  } as RoccoSceneClickAction;
}

function createContext(
  level: NetherCapabilityLevel | null,
  inventory: RoccoInventory,
  engine: CartridgeSdkV1Runtime,
): InteractionContext {
  return {
    action: createSceneClickAction(NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID),
    cartridgeContext: undefined,
    sdk: engine,
    activeLevel: level as InteractionContext['activeLevel'],
    inventory,
    localization: spanishRoccoLocalization,
    getRoccoAppearance: () => 'default',
    setRoccoAppearance: () => {},
    isStanIdentified: () => false,
    isStanAwake: () => false,
    inventoryRuntime: {} as InteractionContext['inventoryRuntime'],
    droppedInventory: {} as InteractionContext['droppedInventory'],
    developerRuntime: {} as InteractionContext['developerRuntime'],
    scriptedSequences: {} as InteractionContext['scriptedSequences'],
    transitions: {} as InteractionContext['transitions'],
  };
}

const [rule] = createNetherSpecialSceneClickRules();

describe('Nether security camera money special rule', () => {
  it('matches the 20 EUR bill on either camera target in Nether 1', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engine = createEngineMock({ clearedCarriedItem: false });
    const context = createContext(level, inventory, engine);

    const carried = createCarriedTwentyEuros();
    expect(rule.matches(context, carried)).toBe(true);

    expect(
      rule.matches(
        { ...context, action: createSceneClickAction(NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID) },
        carried,
      ),
    ).toBe(true);
  });

  it('does not match another item on the camera', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    const engine = createEngineMock({ clearedCarriedItem: false });
    const context = createContext(level, inventory, engine);
    const carried: RoccoGridMenuCarriedItem = {
      definitionId: NETHER_INVENTORY_MENU_ID,
      item: { id: 'rocco-keys', label: 'Keys' },
    };

    expect(rule.matches(context, carried)).toBe(false);
  });

  it('does not match the 20 EUR bill on another target', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engine = createEngineMock({ clearedCarriedItem: false });
    const context = createContext(level, inventory, engine);

    expect(
      rule.matches(
        { ...context, action: createSceneClickAction('some-other-target') },
        createCarriedTwentyEuros(),
      ),
    ).toBe(false);
  });

  it('does not match the 20 EUR bill on the camera in another level', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engine = createEngineMock({ clearedCarriedItem: false });
    const context = createContext(level, inventory, engine);
    const otherLevel = {
      ...level,
      id: 'some-other-level',
    } as NetherCapabilityLevel;

    expect(
      rule.matches(
        { ...context, activeLevel: otherLevel as unknown as InteractionContext['activeLevel'] },
        createCarriedTwentyEuros(),
      ),
    ).toBe(false);
  });

  it('does not match a non scene-click action', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engine = createEngineMock({ clearedCarriedItem: false });
    const baseContext = createContext(level, inventory, engine);
    const context: InteractionContext = {
      ...baseContext,
      action: { targetInstanceId: NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID } as never,
    };

    expect(rule.matches(context, createCarriedTwentyEuros())).toBe(false);
  });

  it('does not match when the level lacks the camera capability', () => {
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engine = createEngineMock({ clearedCarriedItem: false });
    const context = createContext(
      { id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID } as NetherCapabilityLevel,
      inventory,
      engine,
    );

    expect(rule.matches(context, createCarriedTwentyEuros())).toBe(false);
  });

  it('starts the bribe sequence, consumes the bill once, and suppresses movement', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engineState = { clearedCarriedItem: false };
    const engine = createEngineMock(engineState);
    const context = createContext(level, inventory, engine);

    const result = rule.execute(context, createCarriedTwentyEuros(), new AbortController().signal);

    expect(result.handled).toBe(true);
    expect(result.actionResult?.suppressDefaultPlayerMove).toBe(true);
    expect(level.beginCalls).toBe(1);
    expect(inventory.hasItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID)).toBe(false);
    expect(engineState.clearedCarriedItem).toBe(true);
  });

  it('treats a blocked bribe sequence as handled without consuming the bill', () => {
    const level = createCameraCapabilityLevel(false);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoTwentyEurosInventoryItem(spanishRoccoLocalization));
    const engineState = { clearedCarriedItem: false };
    const engine = createEngineMock(engineState);
    const context = createContext(level, inventory, engine);

    const result = rule.execute(context, createCarriedTwentyEuros(), new AbortController().signal);

    expect(result.handled).toBe(true);
    expect(result.actionResult?.suppressDefaultPlayerMove).toBe(true);
    expect(level.beginCalls).toBe(1);
    expect(inventory.hasItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID)).toBe(true);
    expect(engineState.clearedCarriedItem).toBe(true);
  });

  it('declines when the bill is already gone from the inventory', () => {
    const level = createCameraCapabilityLevel(true);
    const inventory = new RoccoInventory();
    const engineState = { clearedCarriedItem: false };
    const engine = createEngineMock(engineState);
    const context = createContext(level, inventory, engine);

    const result = rule.execute(context, createCarriedTwentyEuros(), new AbortController().signal);

    expect(result.handled).toBe(true);
    expect(level.beginCalls).toBe(0);
    expect(engineState.clearedCarriedItem).toBe(true);
  });
});
