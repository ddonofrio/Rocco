import type { RpceLevelConnection, RpceLevelConnectionEndpoint, RpceMapDefinition } from './rpce-map';
import type { RpceLevel } from './rpce-level';

/**
 * Structural subset of a game needed to compile the connection graph. Unlike
 * `RpceGameDefinition`, it does not require a runtime controller, so both the full
 * declarative definition and an ad-hoc runtime graph (with level factories) can be
 * compiled.
 */
export interface RpceGameGraph<TLevel extends RpceLevel = RpceLevel> {
  readonly id: string;
  readonly title: string;
  readonly initialMapId?: string;
  readonly maps: readonly RpceMapDefinition<TLevel>[];
  readonly connections?: readonly RpceLevelConnection[];
}

export type RpceGameCompilationCode =
  | 'duplicate-map-id'
  | 'duplicate-level-id'
  | 'duplicate-connector-id'
  | 'missing-connection-endpoint'
  | 'missing-initial-map'
  | 'missing-initial-level'
  | 'missing-map-initial-level'
  | 'duplicate-connection'
  | 'self-loop-connection';

export class RpceGameCompilationError extends Error {
  readonly code: RpceGameCompilationCode;

  constructor(code: RpceGameCompilationCode, message: string) {
    super(message);
    this.name = 'RpceGameCompilationError';
    this.code = code;
  }
}

export type RpceEndpointKey = string;

export function rpceEndpointKey(levelId: string, connectorId: string): RpceEndpointKey {
  return `${levelId}#${connectorId}`;
}

export interface RpceCompiledEndpoint {
  readonly mapId: string;
  readonly levelId: string;
  readonly connectorId: string;
  readonly target: RpceLevelConnectionEndpoint;
}

export interface RpceCompiledLevel<TLevel extends RpceLevel = RpceLevel> {
  readonly id: string;
  readonly mapId: string;
  readonly title: string;
  readonly developerOnly: boolean;
  readonly createLevel: (() => TLevel) | null;
}

export interface RpceCompiledMap {
  readonly id: string;
  readonly title: string;
  readonly initialLevelId: string | null;
  readonly developerOnly: boolean;
  readonly levelIds: readonly string[];
}

export interface RpceCompiledGame<TLevel extends RpceLevel = RpceLevel> {
  readonly id: string;
  readonly title: string;
  readonly initialMapId: string | null;
  readonly initialLevelId: string | null;
  readonly mapsById: ReadonlyMap<string, RpceCompiledMap>;
  readonly levelsById: ReadonlyMap<string, RpceCompiledLevel<TLevel>>;
  readonly transitionsByEndpoint: ReadonlyMap<RpceEndpointKey, RpceCompiledEndpoint>;
  readonly reachableLevelIds: ReadonlySet<string>;
  resolveConnectedEndpoint(
    levelId: string,
    connectorId: string,
  ): RpceLevelConnectionEndpoint | null;
}

export class RpceGameCompiler {
  compile<TLevel extends RpceLevel = RpceLevel>(
    definition: RpceGameGraph<TLevel>,
  ): RpceCompiledGame<TLevel> {
    const mapsById = new Map<string, RpceCompiledMap>();
    const levelsById = new Map<string, RpceCompiledLevel<TLevel>>();
    const transitionsByEndpoint = new Map<RpceEndpointKey, RpceCompiledEndpoint>();

    for (const map of definition.maps) {
      this.registerMap(map, mapsById, levelsById);
    }

    const allConnections = this.collectConnections(definition);
    this.registerConnections(allConnections, mapsById, levelsById, transitionsByEndpoint);

    const initialMapId = this.resolveInitialMapId(definition, mapsById);
    const initialLevelId = initialMapId
      ? this.resolveInitialLevelId(initialMapId, mapsById)
      : null;

    const reachableLevelIds = this.computeReachableLevelIds(
      initialLevelId,
      transitionsByEndpoint,
    );

    const game: RpceCompiledGame<TLevel> = {
      id: definition.id,
      title: definition.title,
      initialMapId,
      initialLevelId,
      mapsById,
      levelsById,
      transitionsByEndpoint,
      reachableLevelIds,
      resolveConnectedEndpoint: (levelId, connectorId) =>
        transitionsByEndpoint.get(rpceEndpointKey(levelId, connectorId))?.target ?? null,
    };

    return game;
  }

  private registerMap<TLevel extends RpceLevel>(
    map: RpceMapDefinition<TLevel>,
    mapsById: Map<string, RpceCompiledMap>,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
  ): void {
    if (mapsById.has(map.id)) {
      throw new RpceGameCompilationError(
        'duplicate-map-id',
        `Duplicate map id '${map.id}'.`,
      );
    }

    const levelIds: string[] = [];

    for (const level of map.levels) {
      if (levelsById.has(level.id)) {
        throw new RpceGameCompilationError(
          'duplicate-level-id',
          `Duplicate level id '${level.id}' across maps.`,
        );
      }

      levelIds.push(level.id);
      levelsById.set(level.id, {
        id: level.id,
        mapId: map.id,
        title: level.title ?? level.id,
        developerOnly: Boolean(map.developerOnly),
        createLevel: typeof level.createLevel === 'function' ? level.createLevel : null,
      });
    }

    if (map.initialLevelId !== undefined && !levelIds.includes(map.initialLevelId)) {
      throw new RpceGameCompilationError(
        'missing-map-initial-level',
        `Map '${map.id}' initialLevelId '${map.initialLevelId}' is not one of its levels.`,
      );
    }

    mapsById.set(map.id, {
      id: map.id,
      title: map.title,
      initialLevelId: map.initialLevelId ?? null,
      developerOnly: Boolean(map.developerOnly),
      levelIds,
    });
  }

  private collectConnections<TLevel extends RpceLevel>(
    definition: RpceGameGraph<TLevel>,
  ): readonly RpceLevelConnection[] {
    const connections: RpceLevelConnection[] = [];
    for (const map of definition.maps) {
      for (const connection of map.connections) {
        connections.push(connection);
      }
    }

    for (const connection of definition.connections ?? []) {
      connections.push(connection);
    }

    return connections;
  }

  private registerConnections<TLevel extends RpceLevel>(
    connections: readonly RpceLevelConnection[],
    mapsById: Map<string, RpceCompiledMap>,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
    transitionsByEndpoint: Map<RpceEndpointKey, RpceCompiledEndpoint>,
  ): void {
    const seenPairs = new Set<string>();

    for (const connection of connections) {
      this.assertEndpointExists(connection.a, levelsById);
      this.assertEndpointExists(connection.b, levelsById);

      const pairKey = this.connectionPairKey(connection.a, connection.b);
      if (seenPairs.has(pairKey)) {
        throw new RpceGameCompilationError(
          'duplicate-connection',
          `Duplicate connection between '${connection.a.levelId}/${connection.a.connectorId}' and '${connection.b.levelId}/${connection.b.connectorId}'.`,
        );
      }

      seenPairs.add(pairKey);

      if (
        connection.a.levelId === connection.b.levelId &&
        connection.a.connectorId === connection.b.connectorId
      ) {
        throw new RpceGameCompilationError(
          'self-loop-connection',
          `Connection '${connection.a.levelId}/${connection.a.connectorId}' loops to itself.`,
        );
      }

      this.indexEndpoint(connection.a, connection.b, mapsById, transitionsByEndpoint);
      this.indexEndpoint(connection.b, connection.a, mapsById, transitionsByEndpoint);
    }
  }

  private assertEndpointExists<TLevel extends RpceLevel>(
    endpoint: RpceLevelConnectionEndpoint,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
  ): void {
    if (!levelsById.has(endpoint.levelId)) {
      throw new RpceGameCompilationError(
        'missing-connection-endpoint',
        `Connection references unknown level '${endpoint.levelId}'.`,
      );
    }
  }

  private indexEndpoint(
    source: RpceLevelConnectionEndpoint,
    target: RpceLevelConnectionEndpoint,
    mapsById: Map<string, RpceCompiledMap>,
    transitionsByEndpoint: Map<RpceEndpointKey, RpceCompiledEndpoint>,
  ): void {
    const key = rpceEndpointKey(source.levelId, source.connectorId);
    const mapId = mapsById.get(source.levelId)?.id ?? source.levelId;
    transitionsByEndpoint.set(key, {
      mapId,
      levelId: source.levelId,
      connectorId: source.connectorId,
      target,
    });
  }

  private connectionPairKey(
    a: RpceLevelConnectionEndpoint,
    b: RpceLevelConnectionEndpoint,
  ): string {
    const keys = [
      rpceEndpointKey(a.levelId, a.connectorId),
      rpceEndpointKey(b.levelId, b.connectorId),
    ];
    keys.sort();
    return keys.join('|');
  }

  private resolveInitialMapId(
    definition: RpceGameGraph,
    mapsById: Map<string, RpceCompiledMap>,
  ): string | null {
    const initialMapId = definition.initialMapId;
    if (!initialMapId) {
      throw new RpceGameCompilationError(
        'missing-initial-map',
        `Game '${definition.id}' declares no initialMapId.`,
      );
    }

    if (!mapsById.has(initialMapId)) {
      throw new RpceGameCompilationError(
        'missing-initial-map',
        `initialMapId '${initialMapId}' is not a declared map.`,
      );
    }

    return initialMapId;
  }

  private resolveInitialLevelId(
    initialMapId: string,
    mapsById: Map<string, RpceCompiledMap>,
  ): string | null {
    const initialMap = mapsById.get(initialMapId);
    if (!initialMap || !initialMap.initialLevelId) {
      throw new RpceGameCompilationError(
        'missing-initial-level',
        `Initial map '${initialMapId}' declares no initialLevelId.`,
      );
    }

    return initialMap.initialLevelId;
  }

  private computeReachableLevelIds(
    initialLevelId: string | null,
    transitionsByEndpoint: ReadonlyMap<RpceEndpointKey, RpceCompiledEndpoint>,
  ): ReadonlySet<string> {
    const reachable = new Set<string>();
    if (!initialLevelId) {
      return reachable;
    }

    const queue: string[] = [initialLevelId];
    reachable.add(initialLevelId);

    while (queue.length > 0) {
      const levelId = queue.shift() as string;
      for (const endpoint of transitionsByEndpoint.values()) {
        if (endpoint.levelId !== levelId) {
          continue;
        }

        const targetLevelId = endpoint.target.levelId;
        if (!reachable.has(targetLevelId)) {
          reachable.add(targetLevelId);
          queue.push(targetLevelId);
        }
      }
    }

    return reachable;
  }
}

export function createConnectedEndpointResolver(
  connections: readonly RpceLevelConnection[],
): (levelId: string, connectorId: string) => RpceLevelConnectionEndpoint | null {
  return (levelId, connectorId) => {
    for (const connection of connections) {
      if (connection.a.levelId === levelId && connection.a.connectorId === connectorId) {
        return connection.b;
      }

      if (connection.b.levelId === levelId && connection.b.connectorId === connectorId) {
        return connection.a;
      }
    }

    return null;
  };
}

