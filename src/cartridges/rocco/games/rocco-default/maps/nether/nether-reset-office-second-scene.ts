import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import { netherResetOfficeSecondAssetUrls } from './nether-assets';
import { type RoccoNetherSceneDefinition } from './nether-level-support';
import { NETHER_RESET_OFFICE_SECOND_PRINTER_READING_PLANE } from './nether-reset-office-second-printer';

export const ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID = 'rocco-nether-reset-office-second-scene';
export const NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID =
  'rocco-nether-reset-office-second-desk-chair';
export const NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID =
  'rocco-nether-reset-office-second-final-backdrop';

const NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION = { x: 534, y: 249 } as const;
const NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE = { width: 125, height: 216 } as const;

export const NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-reset-office-second-backplate',
    background: 'rocco-nether-reset-office-second-background',
  },
  backgroundUri: netherResetOfficeSecondAssetUrls.background,
  backgroundName: 'Nether Reset Office Second Background',
  extraPlanes: [
    {
      id: NETHER_RESET_OFFICE_SECOND_CHAIR_PLANE_ID,
      name: 'Nether Reset Office Second Desk Chair',
      enabled: true,
      visible: true,
      source: {
        kind: 'image',
        uri: netherResetOfficeSecondAssetUrls.deskChair,
        width: NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE.width,
        height: NETHER_RESET_OFFICE_SECOND_CHAIR_SIZE.height,
      },
      colorModel: { kind: 'native' },
      transform: {
        x: NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION.x,
        y: NETHER_RESET_OFFICE_SECOND_CHAIR_POSITION.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: ROCCO_DESIGN_WIDTH,
        height: ROCCO_DESIGN_HEIGHT,
      },
      opacity: 1,
      priority: 0,
      renderLayer: 'world.behind',
    },
    {
      id: NETHER_RESET_OFFICE_SECOND_FINAL_BACKDROP_PLANE_ID,
      name: 'Nether Reset Office Second Final Screen Backdrop',
      enabled: true,
      source: { kind: 'solid', color: '#141e1a' },
      colorModel: { kind: 'native' },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: { x: 0, y: 0, width: ROCCO_DESIGN_WIDTH, height: ROCCO_DESIGN_HEIGHT },
      opacity: 1,
      priority: 10_000,
      renderLayer: 'foreground',
      visible: false,
    },
    NETHER_RESET_OFFICE_SECOND_PRINTER_READING_PLANE,
  ],
};
