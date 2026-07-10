import type { RoccoLevel } from '../rocco-level-types';
import type { RpceMapDefinition } from '../../rpce/core';

export interface RoccoLevelRegistryOptions {
  maps: readonly RpceMapDefinition<RoccoLevel>[];
}

export class RoccoLevelRegistry {
  private readonly levels = new Map<string, RoccoLevel>();
  private readonly mapsById = new Map<string, RpceMapDefinition<RoccoLevel>>();

  constructor(options: RoccoLevelRegistryOptions) {
    for (const map of options.maps) {
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

    this.registerLevels(this.instantiateMapLevels(map));
  }

  resetNetherLevels(): void {
    this.resetMap('nether');
  }

  private instantiateMapLevels(map: RpceMapDefinition<RoccoLevel>): readonly RoccoLevel[] {
    return map.levels.map((definition) => {
      if (!definition.createLevel) {
        throw new Error(`Map '${map.id}' level '${definition.id}' does not provide a factory.`);
      }

      return definition.createLevel();
    });
  }

  private registerLevels(levels: readonly RoccoLevel[]): void {
    for (const level of levels) {
      this.levels.set(level.id, level);
    }
  }
}
