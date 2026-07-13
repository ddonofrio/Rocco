import { describe, expect, it } from 'vitest';

import { RpceGameCompiler, type RpceGameGraph } from '../../../../../src/cartridges/rocco/rpce/core';
import { RoccoLevelRegistry } from '../../../../../src/cartridges/rocco/levels/runtime/rocco-level-registry';
import type { RoccoLevel } from '../../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { RpceLevelDefinition, RpceMapDefinition } from '../../../../../src/cartridges/rocco/rpce/core';

function makeLevel(id: string): unknown {
  return {
    id,
    title: id,
    connectors: [],
    mount: () => Promise.resolve({ id: `${id}-scene`, planes: [] }),
    unmount: () => {},
    update: () => {},
    handleAction: () => {},
  };
}

function makeMap(id: string, levelIds: string[]): RpceMapDefinition<RoccoLevel> {
  return {
    id,
    title: id,
    initialLevelId: levelIds[0] ?? id,
    levels: levelIds.map((levelId) => ({ id: levelId, createLevel: () => makeLevel(levelId) })) as RpceLevelDefinition<RoccoLevel>[],
    connections: [],
  };
}

function compileGame(maps: RpceMapDefinition<RoccoLevel>[]): RpceGameGraph<RoccoLevel> {
  return {
    id: 'test-game',
    title: 'Test Game',
    initialMapId: maps[0]?.id ?? 'map-a',
    maps,
  };
}

describe('RoccoLevelRegistry', () => {
  it('registers maps and levels', () => {
    const registry = new RoccoLevelRegistry({
      compiledGame: new RpceGameCompiler().compile(compileGame([makeMap('map-a', ['level-1'])])),
    });

    expect(registry.listLevels()).toHaveLength(1);
  });

  it('resetMap replaces a map level with a fresh instance', () => {
    const registry = new RoccoLevelRegistry({
      compiledGame: new RpceGameCompiler().compile(compileGame([makeMap('map-a', ['level-1'])])),
    });

    const firstInstance = registry.requireLevel('level-1');

    registry.resetMap('map-a');

    const secondInstance = registry.requireLevel('level-1');
    expect(secondInstance).not.toBe(firstInstance);
  });

  it('throws on duplicate map id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        compiledGame: new RpceGameCompiler().compile(
          compileGame([makeMap('map-a', ['level-1']), makeMap('map-a', ['level-2'])]),
        ),
      }),
    ).toThrow("Duplicate map id 'map-a'.");
  });

  it('throws on duplicate level id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        compiledGame: new RpceGameCompiler().compile(
          compileGame([makeMap('map-a', ['level-1']), makeMap('map-b', ['level-1'])]),
        ),
      }),
    ).toThrow("Duplicate level id 'level-1' across maps.");
  });
});
