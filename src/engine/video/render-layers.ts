export type RoccoRenderLayerKind = 'background' | 'world' | 'foreground' | 'overlay' | 'ui' | 'display';

export type RoccoDepthSortMode = 'none' | 'y-sort' | 'baseline-sort';

export interface RoccoRenderLayer {
  id: string;
  kind: RoccoRenderLayerKind;
  zIndex: number;
  depthSort: RoccoDepthSortMode;
}

export const defaultRoccoRenderLayers: RoccoRenderLayer[] = [
  { id: 'background.back', kind: 'background', zIndex: 0, depthSort: 'none' },
  { id: 'background.main', kind: 'background', zIndex: 10, depthSort: 'none' },
  { id: 'world.behind', kind: 'world', zIndex: 20, depthSort: 'y-sort' },
  { id: 'world.mid', kind: 'world', zIndex: 25, depthSort: 'none' },
  { id: 'world.actors', kind: 'world', zIndex: 30, depthSort: 'baseline-sort' },
  { id: 'world.front', kind: 'world', zIndex: 40, depthSort: 'y-sort' },
  { id: 'foreground', kind: 'foreground', zIndex: 50, depthSort: 'none' },
  { id: 'ui.action-menu', kind: 'ui', zIndex: 55, depthSort: 'none' },
  { id: 'overlay.primitives', kind: 'overlay', zIndex: 60, depthSort: 'none' },
  { id: 'overlay.messages', kind: 'overlay', zIndex: 68, depthSort: 'none' },
  { id: 'overlay.titles', kind: 'overlay', zIndex: 70, depthSort: 'none' },
  { id: 'ui', kind: 'ui', zIndex: 80, depthSort: 'none' },
  { id: 'display.profile', kind: 'display', zIndex: 90, depthSort: 'none' },
];

export function sortRoccoRenderLayers(layers: RoccoRenderLayer[]): RoccoRenderLayer[] {
  return [...layers].sort((left, right) => {
    if (left.zIndex !== right.zIndex) {
      return left.zIndex - right.zIndex;
    }
    return left.id.localeCompare(right.id);
  });
}
