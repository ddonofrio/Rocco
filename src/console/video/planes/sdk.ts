import type {
  RoccoAttributeEntry,
  RoccoAttributeMap,
  RoccoColor,
  RoccoColorModel,
  RoccoColorRegisterSet,
  RoccoGraphicPlane,
  RoccoPalette,
  RoccoPlanePatch,
  RoccoPlaneScene,
  RoccoPlaneSDK,
  RoccoPlaneSource,
  RoccoTileCell,
  RoccoTilemapSource,
} from './types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function atGrid(width: number, height: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    throw new Error(`Coordinates out of bounds (${x}, ${y}) for grid ${width}x${height}`);
  }

  return y * width + x;
}

function ensureArray<T>(source: T[] | undefined): T[] {
  return source ?? [];
}

function ensurePlaneDefaults(plane: RoccoGraphicPlane): RoccoGraphicPlane {
  return {
    ...plane,
    enabled: plane.enabled ?? true,
    visible: plane.visible ?? true,
    opacity: plane.opacity ?? 1,
    blendMode: plane.blendMode ?? 'normal',
    contrast: plane.contrast,
    occludesInput: plane.occludesInput ?? true,
    priority: plane.priority ?? 0,
    transform: {
      x: plane.transform?.x ?? 0,
      y: plane.transform?.y ?? 0,
      scaleX: plane.transform?.scaleX ?? 1,
      scaleY: plane.transform?.scaleY ?? 1,
      rotation: plane.transform?.rotation ?? 0,
    },
    scroll: {
      x: plane.scroll?.x ?? 0,
      y: plane.scroll?.y ?? 0,
    },
    wrap: {
      x: plane.wrap?.x ?? false,
      y: plane.wrap?.y ?? false,
    },
    colorModel: plane.colorModel ?? { kind: 'native' },
  };
}

export class RoccoGraphicPlaneSDK implements RoccoPlaneSDK {
  private readonly scenes = new Map<string, RoccoPlaneScene>();

  private getScene(sceneId: string): RoccoPlaneScene {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene '${sceneId}' is not loaded`);
    }

    return scene;
  }

  private getPlane(sceneId: string, planeId: string): RoccoGraphicPlane {
    const scene = this.getScene(sceneId);
    const plane = scene.planes.find((item) => item.id === planeId);
    if (!plane) {
      throw new Error(`Plane '${planeId}' was not found in scene '${sceneId}'`);
    }

    return plane;
  }

  private getTilemapSource(sceneId: string, tilemapId: string): RoccoTilemapSource {
    const scene = this.getScene(sceneId);
    for (const plane of scene.planes) {
      if (plane.source.kind === 'tilemap' && plane.source.tilemapId === tilemapId) {
        return plane.source;
      }
    }

    throw new Error(`Tilemap '${tilemapId}' was not found in scene '${sceneId}'`);
  }

  createScene(id: string): RoccoPlaneScene {
    const scene: RoccoPlaneScene = {
      id,
      planes: [],
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
    };

    this.scenes.set(id, clone(scene));
    return clone(scene);
  }

  loadScene(scene: RoccoPlaneScene): void {
    this.scenes.set(scene.id, clone(scene));
  }

  serializeScene(sceneId: string): RoccoPlaneScene {
    return clone(this.getScene(sceneId));
  }

  addPlane(sceneId: string, plane: RoccoGraphicPlane): void {
    const scene = this.getScene(sceneId);
    if (scene.planes.some((existing) => existing.id === plane.id)) {
      throw new Error(`Plane with id '${plane.id}' already exists in scene '${sceneId}'`);
    }

    scene.planes.push(ensurePlaneDefaults(clone(plane)));
  }

  updatePlane(sceneId: string, planeId: string, patch: RoccoPlanePatch): void {
    const plane = this.getPlane(sceneId, planeId);
    const next: RoccoGraphicPlane = {
      ...plane,
      ...patch,
      source: patch.source ? clone(patch.source) : plane.source,
      colorModel: patch.colorModel ? clone(patch.colorModel) : plane.colorModel,
      transform: patch.transform
        ? {
            ...plane.transform,
            ...patch.transform,
          }
        : plane.transform,
      scroll: patch.scroll
        ? {
            ...plane.scroll,
            ...patch.scroll,
          }
        : plane.scroll,
      wrap: patch.wrap
        ? {
            ...plane.wrap,
            ...patch.wrap,
          }
        : plane.wrap,
      parallax: patch.parallax === undefined ? plane.parallax : clone(patch.parallax),
      viewport: patch.viewport === undefined ? plane.viewport : clone(patch.viewport),
      metadata: patch.metadata === undefined ? plane.metadata : clone(patch.metadata),
    };

    Object.assign(plane, ensurePlaneDefaults(next));
  }

  removePlane(sceneId: string, planeId: string): void {
    const scene = this.getScene(sceneId);
    const index = scene.planes.findIndex((plane) => plane.id === planeId);
    if (index === -1) {
      throw new Error(`Plane '${planeId}' was not found in scene '${sceneId}'`);
    }

    scene.planes.splice(index, 1);
  }

  setPlaneSource(sceneId: string, planeId: string, source: RoccoPlaneSource): void {
    const plane = this.getPlane(sceneId, planeId);
    plane.source = clone(source);
  }

  setPlaneColorModel(sceneId: string, planeId: string, colorModel: RoccoColorModel): void {
    const plane = this.getPlane(sceneId, planeId);
    plane.colorModel = clone(colorModel);
  }

  setTile(sceneId: string, tilemapId: string, x: number, y: number, cell: RoccoTileCell): void {
    const tilemap = this.getTilemapSource(sceneId, tilemapId);
    const index = atGrid(tilemap.width, tilemap.height, x, y);
    tilemap.cells[index] = clone(cell);
  }

  getTile(sceneId: string, tilemapId: string, x: number, y: number): RoccoTileCell | undefined {
    const tilemap = this.getTilemapSource(sceneId, tilemapId);
    const index = atGrid(tilemap.width, tilemap.height, x, y);
    const cell = tilemap.cells[index];
    return cell ? clone(cell) : undefined;
  }

  registerPalette(sceneId: string, palette: RoccoPalette): void {
    const scene = this.getScene(sceneId);
    const palettes = ensureArray(scene.palettes);
    const index = palettes.findIndex((existing) => existing.id === palette.id);
    if (index === -1) {
      palettes.push(clone(palette));
    } else {
      palettes[index] = clone(palette);
    }
    scene.palettes = palettes;
  }

  updatePalette(sceneId: string, paletteId: string, colors: RoccoColor[]): void {
    const scene = this.getScene(sceneId);
    const palettes = ensureArray(scene.palettes);
    const palette = palettes.find((item) => item.id === paletteId);
    if (!palette) {
      throw new Error(`Palette '${paletteId}' was not found in scene '${sceneId}'`);
    }

    palette.colors = [...colors];
  }

  registerColorRegisterSet(sceneId: string, registerSet: RoccoColorRegisterSet): void {
    const scene = this.getScene(sceneId);
    const registers = ensureArray(scene.colorRegisterSets);
    const index = registers.findIndex((existing) => existing.id === registerSet.id);
    if (index === -1) {
      registers.push(clone(registerSet));
    } else {
      registers[index] = clone(registerSet);
    }
    scene.colorRegisterSets = registers;
  }

  updateColorRegister(sceneId: string, registerSetId: string, key: string, color: RoccoColor): void {
    const scene = this.getScene(sceneId);
    const registers = ensureArray(scene.colorRegisterSets);
    const registerSet = registers.find((item) => item.id === registerSetId);
    if (!registerSet) {
      throw new Error(`Color register set '${registerSetId}' was not found in scene '${sceneId}'`);
    }

    registerSet.colors[key] = color;
  }

  registerAttributeMap(sceneId: string, attributeMap: RoccoAttributeMap): void {
    const scene = this.getScene(sceneId);
    const attributeMaps = ensureArray(scene.attributeMaps);
    const index = attributeMaps.findIndex((existing) => existing.id === attributeMap.id);
    if (index === -1) {
      attributeMaps.push(clone(attributeMap));
    } else {
      attributeMaps[index] = clone(attributeMap);
    }
    scene.attributeMaps = attributeMaps;
  }

  setAttribute(
    sceneId: string,
    attributeMapId: string,
    x: number,
    y: number,
    entry: RoccoAttributeEntry,
  ): void {
    const scene = this.getScene(sceneId);
    const attributeMaps = ensureArray(scene.attributeMaps);
    const attributeMap = attributeMaps.find((item) => item.id === attributeMapId);
    if (!attributeMap) {
      throw new Error(`Attribute map '${attributeMapId}' was not found in scene '${sceneId}'`);
    }

    const index = atGrid(attributeMap.width, attributeMap.height, x, y);
    attributeMap.entries[index] = clone(entry);
  }

  resolvePlane(sceneId: string, planeId: string): RoccoGraphicPlane | undefined {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      return undefined;
    }

    return scene.planes.find((item) => item.id === planeId);
  }
}
