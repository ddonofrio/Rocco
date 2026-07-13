import { describe, expect, it } from 'vitest';

import { RoccoLevelRegistry } from '../../../../../src/cartridges/rocco/levels/runtime/rocco-level-registry';
import type { RoccoLevel } from '../../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { RpceMapDefinition } from '../../../../../src/cartridges/rocco/rpce/core';

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

function makeMap(id: string, levelIds: string[]): unknown {
  return {
    id,
    title: id,
    initialLevelId: levelIds[0] ?? id,
    levels: levelIds.map((levelId) => ({ id: levelId, createLevel: () => makeLevel(levelId) })),
    connections: [],
  };
}

describe('RoccoLevelRegistry', () => {
  it('registers maps and levels', () => {
    const registry = new RoccoLevelRegistry({
      maps: [makeMap('map-a', ['level-1']) as RpceMapDefinition<RoccoLevel>],
    });

    expect(registry.listLevels()).toHaveLength(1);
  });

  it('throws on duplicate map id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        maps: [
          makeMap('map-a', ['level-1']) as RpceMapDefinition<RoccoLevel>,
          makeMap('map-a', ['level-2']) as RpceMapDefinition<RoccoLevel>,
        ],
      }),
    ).toThrow("Duplicate map registration 'map-a'.");
  });

  it('throws on duplicate level id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        maps: [
          makeMap('map-a', ['level-1']) as RpceMapDefinition<RoccoLevel>,
          makeMap('map-b', ['level-1']) as RpceMapDefinition<RoccoLevel>,
        ],
      }),
    ).toThrow("Duplicate level registration 'level-1'.");
  });
});
