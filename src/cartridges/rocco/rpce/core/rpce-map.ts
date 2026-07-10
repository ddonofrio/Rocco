import type { RpceLevel } from './rpce-level';
import type { RpceGameRuntimeController } from './rpce-game-runtime';

export interface RpceLevelConnectionEndpoint {
  levelId: string;
  connectorId: string;
}

export interface RpceLevelConnection {
  a: RpceLevelConnectionEndpoint;
  b: RpceLevelConnectionEndpoint;
}

export interface RpceLevelDefinition<TLevel extends RpceLevel = RpceLevel> {
  id: string;
  createLevel?: () => TLevel;
}

export interface RpceMapDefinition<TLevel extends RpceLevel = RpceLevel> {
  id: string;
  title: string;
  levels: readonly RpceLevelDefinition<TLevel>[];
  connections: readonly RpceLevelConnection[];
  initialLevelId?: string;
  developerOnly?: boolean;
}

export interface RpceGameRuntimeHooks {
  beforeMount?(): void;
  afterMount?(): void;
  beforeUnmount?(): void;
}

export interface RpceGameDefinition<
  TControllerOptions,
  TMountResult = unknown,
  TLevel extends RpceLevel = RpceLevel,
> {
  id: string;
  title: string;
  maps: readonly RpceMapDefinition<TLevel>[];
  initialMapId?: string;
  hooks?: RpceGameRuntimeHooks;
  createRuntimeController: (
    options: TControllerOptions,
  ) => RpceGameRuntimeController<TMountResult>;
}
