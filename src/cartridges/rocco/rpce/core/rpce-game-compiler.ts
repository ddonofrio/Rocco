import type {
  RpceLevelConnection,
  RpceLevelConnectionEndpoint,
  RpceLevelDefinition,
  RpceMapDefinition,
  RpceScriptedConnection,
} from './rpce-map';
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
  readonly scriptedConnections?: readonly RpceScriptedConnection[];
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
  | 'ambiguous-connection-endpoint'
  | 'self-loop-connection';

export class RpceGameCompilationError extends Error {
  readonly code: RpceGameCompilationCode;

  constructor(code: RpceGameCompilationCode, message: string) {
    super(message);
    this.name = 'RpceGameCompilationError';
    this.code = code;
  }
}

export function rpceEndpointKey(levelId: string, connectorId: string): string {
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
  readonly connectorIds: readonly string[];
  readonly createLevel: (() => TLevel) | undefined;
}

export interface RpceCompiledMap {
  readonly id: string;
  readonly title: string;
  readonly initialLevelId: string;
  readonly developerOnly: boolean;
  readonly levelIds: readonly string[];
}

export interface RpceCompiledGame<TLevel extends RpceLevel = RpceLevel> {
  readonly id: string;
  readonly title: string;
  readonly initialMapId: string;
  readonly initialLevelId: string;
  readonly mapsById: ReadonlyMap<string, RpceCompiledMap>;
  readonly levelsById: ReadonlyMap<string, RpceCompiledLevel<TLevel>>;
  readonly transitionsByEndpoint: ReadonlyMap<string, RpceCompiledEndpoint>;
  readonly reachableLevelIds: ReadonlySet<string>;
  resolveConnectedEndpoint(
    levelId: string,
    connectorId: string,
  ): RpceLevelConnectionEndpoint | null;
}

interface RpceCollectedConnections {
  readonly connections: readonly RpceLevelConnection[];
  readonly scriptedConnections: readonly RpceScriptedConnection[];
}

function nullValue<T>(): T {
  return JSON.parse('null') as T;
}

export class RpceGameCompiler {
  private registerMap<TLevel extends RpceLevel>(
    map: RpceMapDefinition<TLevel>,
    mapsById: Map<string, RpceCompiledMap>,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
  ): void {
    if (mapsById.has(map.id)) {
      throw new RpceGameCompilationError('duplicate-map-id', `Duplicate map id '${map.id}'.`);
    }

    const levelIds: string[] = [];

    for (const level of map.levels) {
      if (levelsById.has(level.id)) {
        throw new RpceGameCompilationError(
          'duplicate-level-id',
          `Duplicate level id '${level.id}' across maps.`,
        );
      }

      const connectorIds = this.collectConnectorIds(level);
      this.assertUniqueConnectorIds(level.id, connectorIds);

      levelIds.push(level.id);
      levelsById.set(level.id, {
        id: level.id,
        mapId: map.id,
        title: level.title ?? level.id,
        developerOnly: Boolean(map.developerOnly),
        connectorIds: Object.freeze([...connectorIds]),
        createLevel: level.createLevel,
      });
    }

    if (!map.initialLevelId) {
      throw new RpceGameCompilationError(
        'missing-initial-level',
        `Map '${map.id}' declares no initialLevelId.`,
      );
    }

    if (!levelIds.includes(map.initialLevelId)) {
      throw new RpceGameCompilationError(
        'missing-map-initial-level',
        `Map '${map.id}' initialLevelId '${map.initialLevelId}' is not one of its levels.`,
      );
    }

    mapsById.set(map.id, {
      id: map.id,
      title: map.title,
      initialLevelId: map.initialLevelId,
      developerOnly: Boolean(map.developerOnly),
      levelIds: Object.freeze([...levelIds]),
    });
  }

  private collectConnectorIds<TLevel extends RpceLevel>(
    level: RpceLevelDefinition<TLevel>,
  ): readonly string[] {
    if (level.connectorIds) {
      return [...level.connectorIds];
    }

    if (typeof level.createLevel !== 'function') {
      return [];
    }

    try {
      return level.createLevel().connectors.map((connector) => connector.id);
    } catch {
      return [];
    }
  }

  private assertUniqueConnectorIds(levelId: string, connectorIds: readonly string[]): void {
    const seen = new Set<string>();
    for (const connectorId of connectorIds) {
      if (seen.has(connectorId)) {
        throw new RpceGameCompilationError(
          'duplicate-connector-id',
          `Level '${levelId}' declares duplicate connector id '${connectorId}'.`,
        );
      }

      seen.add(connectorId);
    }
  }

  private collectConnections<TLevel extends RpceLevel>(
    definition: RpceGameGraph<TLevel>,
  ): RpceCollectedConnections {
    const connections: RpceLevelConnection[] = [];
    const scriptedConnections: RpceScriptedConnection[] = [];

    for (const map of definition.maps) {
      connections.push(...map.connections);
      scriptedConnections.push(...(map.scriptedConnections ?? []));
    }

    connections.push(...(definition.connections ?? []));
    scriptedConnections.push(...(definition.scriptedConnections ?? []));

    return {
      connections,
      scriptedConnections,
    };
  }

  private registerConnections<TLevel extends RpceLevel>(
    connections: readonly RpceLevelConnection[],
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
    transitionsByEndpoint: Map<string, RpceCompiledEndpoint>,
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

      this.indexEndpoint(connection.a, connection.b, levelsById, transitionsByEndpoint);
      this.indexEndpoint(connection.b, connection.a, levelsById, transitionsByEndpoint);
    }
  }

  private registerScriptedConnections<TLevel extends RpceLevel>(
    scriptedConnections: readonly RpceScriptedConnection[],
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
    transitionsByEndpoint: Map<string, RpceCompiledEndpoint>,
  ): void {
    for (const connection of scriptedConnections) {
      this.assertEndpointExists(connection.source, levelsById);
      this.assertEndpointExists(connection.target, levelsById);

      if (
        connection.source.levelId === connection.target.levelId &&
        connection.source.connectorId === connection.target.connectorId
      ) {
        throw new RpceGameCompilationError(
          'self-loop-connection',
          `Scripted connection '${connection.id}' loops to itself at '${connection.source.levelId}/${connection.source.connectorId}'.`,
        );
      }

      this.indexEndpoint(connection.source, connection.target, levelsById, transitionsByEndpoint);
    }
  }

  private assertEndpointExists<TLevel extends RpceLevel>(
    endpoint: RpceLevelConnectionEndpoint,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
  ): void {
    const level = levelsById.get(endpoint.levelId);
    if (!level) {
      throw new RpceGameCompilationError(
        'missing-connection-endpoint',
        `Connection references unknown level '${endpoint.levelId}'.`,
      );
    }

    if (level.connectorIds.length === 0) {
      return;
    }

    if (!level.connectorIds.includes(endpoint.connectorId)) {
      throw new RpceGameCompilationError(
        'missing-connection-endpoint',
        `Connection references unknown connector '${endpoint.connectorId}' on level '${endpoint.levelId}'.`,
      );
    }
  }

  private indexEndpoint<TLevel extends RpceLevel>(
    source: RpceLevelConnectionEndpoint,
    target: RpceLevelConnectionEndpoint,
    levelsById: Map<string, RpceCompiledLevel<TLevel>>,
    transitionsByEndpoint: Map<string, RpceCompiledEndpoint>,
  ): void {
    const key = rpceEndpointKey(source.levelId, source.connectorId);
    const existing = transitionsByEndpoint.get(key);
    if (existing) {
      if (
        existing.target.levelId === target.levelId &&
        existing.target.connectorId === target.connectorId
      ) {
        throw new RpceGameCompilationError(
          'duplicate-connection',
          `Duplicate connection from '${source.levelId}/${source.connectorId}' to '${target.levelId}/${target.connectorId}'.`,
        );
      }

      throw new RpceGameCompilationError(
        'ambiguous-connection-endpoint',
        `Endpoint '${source.levelId}/${source.connectorId}' points to both '${existing.target.levelId}/${existing.target.connectorId}' and '${target.levelId}/${target.connectorId}'.`,
      );
    }

    const mapId = levelsById.get(source.levelId)?.mapId ?? source.levelId;
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
    const keys = [rpceEndpointKey(a.levelId, a.connectorId), rpceEndpointKey(b.levelId, b.connectorId)];
    keys.sort((left, right) => left.localeCompare(right));
    return keys.join('|');
  }

  private resolveInitialMapId(
    definition: RpceGameGraph,
    mapsById: Map<string, RpceCompiledMap>,
  ): string {
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
  ): string {
    const initialMap = mapsById.get(initialMapId);
    if (!initialMap?.initialLevelId) {
      throw new RpceGameCompilationError(
        'missing-initial-level',
        `Initial map '${initialMapId}' declares no initialLevelId.`,
      );
    }

    return initialMap.initialLevelId;
  }

  private enqueueReachableTargetLevel(
    levelId: string,
    endpoint: RpceCompiledEndpoint,
    reachable: Set<string>,
    queue: string[],
  ): void {
    if (endpoint.levelId !== levelId) {
      return;
    }

    const targetLevelId = endpoint.target.levelId;
    if (reachable.has(targetLevelId)) {
      return;
    }

    reachable.add(targetLevelId);
    queue.push(targetLevelId);
  }

  private computeReachableLevelIds(
    initialLevelId: string,
    transitionsByEndpoint: ReadonlyMap<string, RpceCompiledEndpoint>,
  ): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [initialLevelId];
    reachable.add(initialLevelId);

    while (queue.length > 0) {
      const levelId = queue.shift() as string;
      for (const endpoint of transitionsByEndpoint.values()) {
        this.enqueueReachableTargetLevel(levelId, endpoint, reachable, queue);
      }
    }

    return reachable;
  }

  compile<TLevel extends RpceLevel = RpceLevel>(
    definition: RpceGameGraph<TLevel>,
  ): RpceCompiledGame<TLevel> {
    const mapsById = new Map<string, RpceCompiledMap>();
    const levelsById = new Map<string, RpceCompiledLevel<TLevel>>();
    const transitionsByEndpoint = new Map<string, RpceCompiledEndpoint>();

    for (const map of definition.maps) {
      this.registerMap(map, mapsById, levelsById);
    }

    const { connections, scriptedConnections } = this.collectConnections(definition);
    this.registerConnections(connections, levelsById, transitionsByEndpoint);
    this.registerScriptedConnections(scriptedConnections, levelsById, transitionsByEndpoint);

    const initialMapId = this.resolveInitialMapId(definition, mapsById);
    const initialLevelId = this.resolveInitialLevelId(initialMapId, mapsById);

    const reachableLevelIds = this.computeReachableLevelIds(initialLevelId, transitionsByEndpoint);
    const readonlyMapsById = new ReadonlyMapView(mapsById);
    const readonlyLevelsById = new ReadonlyMapView(levelsById);
    const readonlyTransitionsByEndpoint = new ReadonlyMapView(transitionsByEndpoint);
    const readonlyReachableLevelIds = new ReadonlySetView(reachableLevelIds);

    const game: RpceCompiledGame<TLevel> = {
      id: definition.id,
      title: definition.title,
      initialMapId,
      initialLevelId,
      mapsById: readonlyMapsById,
      levelsById: readonlyLevelsById,
      transitionsByEndpoint: readonlyTransitionsByEndpoint,
      reachableLevelIds: readonlyReachableLevelIds,
      resolveConnectedEndpoint: (levelId, connectorId) => {
        const targetEndpoint = readonlyTransitionsByEndpoint.get(
          rpceEndpointKey(levelId, connectorId),
        )?.target;
        return targetEndpoint ?? nullValue<RpceLevelConnectionEndpoint>();
      },
    };

    return game;
  }
}

class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  private readonly source: ReadonlyMap<K, V>;

  constructor(source: ReadonlyMap<K, V>) {
    this.source = source;
  }

  get size(): number {
    return this.source.size;
  }

  get(key: K): V | undefined {
    return this.source.get(key);
  }

  has(key: K): boolean {
    return this.source.has(key);
  }

  entries(): ReturnType<Map<K, V>['entries']> {
    return this.source.entries();
  }

  keys(): ReturnType<Map<K, V>['keys']> {
    return this.source.keys();
  }

  values(): ReturnType<Map<K, V>['values']> {
    return this.source.values();
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArgument?: unknown,
  ): void {
    this.source.forEach((value, key) => {
      callbackfn.call(thisArgument, value, key, this);
    });
  }

  [Symbol.iterator](): ReturnType<Map<K, V>['entries']> {
    return this.source[Symbol.iterator]();
  }
}

class ReadonlySetView<T> implements ReadonlySet<T> {
  private readonly source: ReadonlySet<T>;

  constructor(source: ReadonlySet<T>) {
    this.source = source;
  }

  get size(): number {
    return this.source.size;
  }

  has(value: T): boolean {
    return this.source.has(value);
  }

  entries(): ReturnType<Set<T>['entries']> {
    return this.source.entries();
  }

  keys(): ReturnType<Set<T>['keys']> {
    return this.source.keys();
  }

  values(): ReturnType<Set<T>['values']> {
    return this.source.values();
  }

  forEach(
    callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
    thisArgument?: unknown,
  ): void {
    this.source.forEach((value) => {
      callbackfn.call(thisArgument, value, value, this);
    });
  }

  [Symbol.iterator](): ReturnType<Set<T>['values']> {
    return this.source[Symbol.iterator]();
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

    return nullValue<RpceLevelConnectionEndpoint | null>();
  };
}
