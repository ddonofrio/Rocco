import { describe, expect, it } from 'vitest';

import { RoccoLevelRegistry } from '../../../../../src/cartridges/rocco/levels/runtime/rocco-level-registry';

function makeLevel(id: string): any {
  return {
    id,
    title: id,
    connectors: [],
    mount: async () => ({ id: `${id}-scene`, planes: [] }),
    unmount: () => {},
    update: () => {},
    handleAction: () => {},
  };
}

function makeMap(id: string, levelIds: string[]): any {
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
      maps: [makeMap('map-a', ['level-1'])],
    });

    expect(registry.listLevels()).toHaveLength(1);
  });

  it('throws on duplicate map id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        maps: [makeMap('map-a', ['level-1']), makeMap('map-a', ['level-2'])],
      }),
    ).toThrow("Duplicate map registration 'map-a'.");
  });

  it('throws on duplicate level id', () => {
    expect(() =>
      new RoccoLevelRegistry({
        maps: [
          makeMap('map-a', ['level-1']),
          makeMap('map-b', ['level-1']),
        ],
      }),
    ).toThrow("Duplicate level registration 'level-1'.");
  });
});
