/// <reference lib="esnext.iterator" />

import type { RpceCompiledGame, RpceCompiledMap } from '../../rpce/core';
import type { RoccoLevel } from '../rocco-level-types';

export interface RoccoLevelRegistryOptions {
  compiledGame: RpceCompiledGame<RoccoLevel>;
}

export interface RoccoPreparedLevelMapReset {
  readonly mapId: string;
  readonly levelIds: readonly string[];

  requireLevel(levelId: string): RoccoLevel;
  commit(): void;
  rollback(): void;
}

export class RoccoLevelRegistry {
  private readonly levels = new Map<string, RoccoLevel>();
  private readonly mapsById = new Map<string, RpceCompiledMap>();
  private readonly compiledGame: RpceCompiledGame<RoccoLevel>;

  constructor(options: RoccoLevelRegistryOptions) {
    this.compiledGame = options.compiledGame;
    for (const map of options.compiledGame.mapsById.values()) {
      this.mapsById.set(map.id, map);
      this.registerLevels(this.instantiateMapLevels(map));
    }
  }

  private instantiateMapLevels(map: RpceCompiledMap): readonly RoccoLevel[] {
    return map.levelIds.map((levelId) => {
      const compiledLevel = this.compiledGame.levelsById.get(levelId);
      if (!compiledLevel?.createLevel) {
        throw new Error(`Map '${map.id}' level '${levelId}' has no factory.`);
      }

      return compiledLevel.createLevel();
    });
  }

  private registerLevels(levels: readonly RoccoLevel[]): void {
    for (const level of levels) {
      if (this.levels.has(level.id)) {
        throw new Error(`Duplicate level registration '${level.id}'.`);
      }
      this.levels.set(level.id, level);
    }
  }

  private replaceLevels(levelIds: readonly string[], nextLevels: readonly RoccoLevel[]): void {
    for (const levelId of levelIds) {
      this.levels.delete(levelId);
    }

    this.registerLevels(nextLevels);
  }

  requireLevel(levelId: string): RoccoLevel {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level '${levelId}' is not registered.`);
    }

    return level;
  }

  listLevels(): readonly RoccoLevel[] {
    return this.levels.values().toArray();
  }

  prepareMapReset(mapId: string): RoccoPreparedLevelMapReset {
    const map = this.mapsById.get(mapId);
    if (!map) {
      throw new Error(`Map '${mapId}' is not registered.`);
    }

    const previousLevels = map.levelIds.map((levelId) => {
      const level = this.levels.get(levelId);
      if (!level) {
        throw new Error(`Map '${mapId}' level '${levelId}' is not registered.`);
      }

      return level;
    });
    const nextLevels = this.instantiateMapLevels(map);
    const nextLevelsById = new Map(nextLevels.map((level) => [level.id, level]));
    let isCommitted = false;

    return {
      mapId,
      levelIds: [...map.levelIds],
      requireLevel: (levelId) => {
        const level = nextLevelsById.get(levelId);
        if (!level) {
          throw new Error(`Prepared map '${mapId}' does not contain level '${levelId}'.`);
        }

        return level;
      },
      commit: () => {
        if (isCommitted) {
          return;
        }

        this.replaceLevels(map.levelIds, nextLevels);
        isCommitted = true;
      },
      rollback: () => {
        if (!isCommitted) {
          return;
        }

        this.replaceLevels(map.levelIds, previousLevels);
        isCommitted = false;
      },
    };
  }

  resetMap(mapId: string): void {
    this.prepareMapReset(mapId).commit();
  }
}
