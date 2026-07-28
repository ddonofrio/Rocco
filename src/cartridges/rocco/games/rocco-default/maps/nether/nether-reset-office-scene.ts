import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import type { RoccoLevelConnector } from '../../../../levels/rocco-level-types';
import { netherResetOfficeAssetUrls } from './nether-assets';
import { toOriginFromGroundPoint, type RoccoNetherSceneDefinition } from './nether-level-support';

export const ROCCO_NETHER_RESET_OFFICE_SCENE_ID = 'rocco-nether-reset-office-scene';

const NETHER_RESET_OFFICE_ENTRY_CONNECTOR_ID = 'entry';
const NETHER_RESET_OFFICE_ROOM_CONNECTOR_ID = 'south';

export const NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT = 30;
export const NETHER_RESET_OFFICE_ENTRY_POSITION = { x: 371, y: 138 } as const;
export const NETHER_RESET_OFFICE_ROCCO_SCALE = ROCCO_PLAYER_CONFIG.motion.scale * 1.8;
export const NETHER_RESET_OFFICE_ROCCO_TINT = '#cccccc';
export const NETHER_RESET_OFFICE_FAR_SCALE = 0.8;
export const NETHER_RESET_OFFICE_OPEN_DOOR_PLANE_ID = 'rocco-nether-reset-office-open-door';
export const NETHER_RESET_OFFICE_OPEN_DOOR_POSITION = { x: 381, y: 123 } as const;
export const NETHER_RESET_OFFICE_OPEN_DOOR_SIZE = { width: 232, height: 291 } as const;
export const NETHER_RESET_OFFICE_ROCCO_ARRIVAL_GROUND_POINT = { x: 474, y: 367 } as const;
export const NETHER_RESET_OFFICE_ROCCO_FINAL_GROUND_POINT = { x: 496, y: 439 } as const;
export const NETHER_RESET_OFFICE_GUYSPRITE_GROUND_POINT = { x: 371, y: 429 } as const;
export const NETHER_RESET_OFFICE_GUYSPRITE_SCALE = GUYSPRITE_CONFIG.motion.scale * 1.65;
export const NETHER_RESET_OFFICE_ARRIVAL_MESSAGE_TTL_MS = 3000;
export const NETHER_RESET_OFFICE_DOOR_CLOSE_DIALOGUE_DELAY_MS = 250;
export const NETHER_RESET_OFFICE_DEPARTURE_REMINDER_INTERVAL_MS = 10_000;
export const NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_TTL_MS = 3000;
export const NETHER_RESET_OFFICE_DEPARTURE_MESSAGE_ID =
  'rocco-nether-reset-office-departure-message';
export const NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS = 1300;
export const NETHER_RESET_OFFICE_DEFEAT_TITLE_DURATION_MS = 3600;
export const NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID = 'rocco-nether-reset-office-defeat-fade';
export const NETHER_RESET_OFFICE_DEFEAT_TITLE_ID = 'rocco-nether-reset-office-defeat-title';
export const NETHER_RESET_OFFICE_DEFEAT_SOUND_ID = 'rocco-nether-reset-office-defeat-sound';
export const NETHER_RESET_OFFICE_ARRIVAL_INPUT_LEASE_ID = 'nether-office-arrival';

const NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT = {
  x: 371,
  y: ROCCO_DESIGN_HEIGHT - 22,
} as const;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_SCALE,
);

export const NETHER_RESET_OFFICE_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_RESET_OFFICE_ENTRY_CONNECTOR_ID,
    entryPoint: { ...NETHER_RESET_OFFICE_ENTRY_POSITION },
    entryFacing: 'down',
  },
  {
    id: NETHER_RESET_OFFICE_ROOM_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: ROCCO_DESIGN_HEIGHT - NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
      width: ROCCO_DESIGN_WIDTH,
      height: NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
    },
    exitDescriptionKey: 'otherOfficePart',
    entryPoint: { ...NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
] as const;

export const NETHER_RESET_OFFICE_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_RESET_OFFICE_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-reset-office-backplate',
    background: 'rocco-nether-reset-office-background',
  },
  backgroundUri: netherResetOfficeAssetUrls.background,
  backgroundName: 'Nether Reset Office Background',
  extraPlanes: [
    {
      id: NETHER_RESET_OFFICE_OPEN_DOOR_PLANE_ID,
      name: 'Nether Reset Office Open Door',
      enabled: false,
      visible: false,
      source: {
        kind: 'image',
        uri: netherResetOfficeAssetUrls.openDoor,
        width: NETHER_RESET_OFFICE_OPEN_DOOR_SIZE.width,
        height: NETHER_RESET_OFFICE_OPEN_DOOR_SIZE.height,
      },
      colorModel: { kind: 'native' },
      transform: {
        x: NETHER_RESET_OFFICE_OPEN_DOOR_POSITION.x,
        y: NETHER_RESET_OFFICE_OPEN_DOOR_POSITION.y,
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
  ],
};
