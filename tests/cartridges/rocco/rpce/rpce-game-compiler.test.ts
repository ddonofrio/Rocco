import { describe, expect, it } from 'vitest';

import {
  RpceGameCompiler,
  RpceGameCompilationError,
  createConnectedEndpointResolver,
  type RpceGameGraph,
} from '../../../../src/cartridges/rocco/rpce/core';
import type { RpceLevelDefinition, RpceMapDefinition, RpceLevelConnection } from '../../../../src/cartridges/rocco/rpce/core';
import {
  createRoccoDefaultGameDefinition,
  createRoccoLocalization,
} from '../../../../src/cartridges/rocco/games/rocco-default';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';

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

function level(id: string): RpceLevelDefinition<RoccoLevel> {
  return { id, createLevel: () => makeLevel(id) as RoccoLevel };
}

function map(
  id: string,
  levelIds: string[],
  connections: readonly RpceLevelConnection[] = [],
  initialLevelId: string = levelIds[0],
): RpceMapDefinition<RoccoLevel> {
  return {
    id,
    title: id,
    initialLevelId,
    levels: levelIds.map((levelId) => level(levelId)),
    connections,
  };
}

function connection(a: [string, string], b: [string, string]): RpceLevelConnection {
  return {
    a: { levelId: a[0], connectorId: a[1] },
    b: { levelId: b[0], connectorId: b[1] },
  };
}

function graph(
  maps: RpceMapDefinition<RoccoLevel>[],
  initialMapId: string = maps[0].id,
  extra?: Partial<RpceGameGraph<RoccoLevel>>,
): RpceGameGraph<RoccoLevel> {
  return {
    id: 'test-game',
    title: 'Test Game',
    initialMapId,
    maps,
    ...extra,
  };
}

const compiler = new RpceGameCompiler();

describe('RpceGameCompiler', () => {
  it('compiles the shipped rocco-default game graph', () => {
    const game = compiler.compile(createRoccoDefaultGameDefinition(createRoccoLocalization('en')));

    expect(game.initialMapId).toBe('pier');
    expect(game.initialLevelId).toBe('pier-middle');
    expect(game.mapsById.size).toBe(3);
    expect(game.levelsById.size).toBe(10);
  });

  it('indexes intra-map and cross-map connections for O(1) lookup', () => {
    const game = compiler.compile(createRoccoDefaultGameDefinition(createRoccoLocalization('en')));

    expect(game.resolveConnectedEndpoint('pier-middle', 'east')).toEqual({
      levelId: 'pier-start',
      connectorId: 'west',
    });
    expect(game.resolveConnectedEndpoint('pier-start', 'west')).toEqual({
      levelId: 'pier-middle',
      connectorId: 'east',
    });
    expect(game.resolveConnectedEndpoint('bait-shop-toilet', 'portal')).toEqual({
      levelId: 'nether-console-hardware-spawn',
      connectorId: 'entry',
    });
  });

  it('reports reachable levels from the initial level', () => {
    const game = compiler.compile(createRoccoDefaultGameDefinition(createRoccoLocalization('en')));

    expect(game.reachableLevelIds.has('pier-middle')).toBe(true);
    expect(game.reachableLevelIds.has('pier-start')).toBe(true);
    expect(game.reachableLevelIds.has('pier-end')).toBe(true);
    // The shop is reached through scripted transitions, not the connector graph.
    expect(game.reachableLevelIds.has('bait-shop')).toBe(false);
  });

  it('throws on a duplicate map id', () => {
    expect(() =>
      compiler.compile(graph([map('map-a', ['l1']), map('map-a', ['l2'])])),
    ).toThrow(RpceGameCompilationError);
  });

  it('throws on a duplicate level id across maps', () => {
    expect(() =>
      compiler.compile(graph([map('map-a', ['l1']), map('map-b', ['l1'])])),
    ).toThrow(RpceGameCompilationError);
  });

  it('throws when a connection references an unknown level', () => {
    const broken = graph([
      map('map-a', ['l1', 'l2'], [connection(['l1', 'north'], ['missing', 'south'])]),
    ]);

    expect(() => compiler.compile(broken)).toThrow(/unknown level 'missing'/);
  });

  it('throws when no initial map is declared', () => {
    expect(() =>
      compiler.compile({ id: 'test-game', title: 'Test Game', maps: [map('map-a', ['l1'])] }),
    ).toThrow(/no initialMapId/);
  });

  it('throws when the initial map has no initial level', () => {
    const broken = graph([{ ...map('map-a', ['l1']), initialLevelId: undefined }]);

    expect(() => compiler.compile(broken)).toThrow(/no initialLevelId/);
  });

  it('throws on a duplicate connection', () => {
    const broken = graph([
      map('map-a', ['l1', 'l2'], [
        connection(['l1', 'north'], ['l2', 'south']),
        connection(['l2', 'south'], ['l1', 'north']),
      ]),
    ]);

    expect(() => compiler.compile(broken)).toThrow(/Duplicate connection/);
  });

  it('throws on a self-loop connection', () => {
    const broken = graph([
      map('map-a', ['l1'], [connection(['l1', 'loop'], ['l1', 'loop'])]),
    ]);

    expect(() => compiler.compile(broken)).toThrow(/loops to itself/);
  });

  it('exposes a linear-scan resolver for flat connection lists', () => {
    const connections = [connection(['l1', 'north'], ['l2', 'south'])];
    const resolve = createConnectedEndpointResolver(connections);

    expect(resolve('l1', 'north')).toEqual({ levelId: 'l2', connectorId: 'south' });
    expect(resolve('l2', 'south')).toEqual({ levelId: 'l1', connectorId: 'north' });
    expect(resolve('l1', 'west')).toBeNull();
  });
});
