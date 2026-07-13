import type { RoccoLevel } from '../rocco-level-types';
import type { RpceCompiledGame, RpceCompiledMap } from '../../rpce/core';

export interface RoccoLevelRegistryOptions {
  compiledGame: RpceCompiledGame<RoccoLevel>;
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

  requireLevel(levelId: string): RoccoLevel {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level '${levelId}' is not registered.`);
    }

    return level;
  }

  listLevels(): readonly RoccoLevel[] {
    return [...this.levels.values()];
  }

  resetMap(mapId: string): void {
    const map = this.mapsById.get(mapId);
    if (!map) {
      throw new Error(`Map '${mapId}' is not registered.`);
    }

    for (const levelId of map.levelIds) {
      this.levels.delete(levelId);
    }

    this.registerLevels(this.instantiateMapLevels(map));
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
}
