import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type {
  RoccoActionMenuDefinition,
} from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../engine/video/sprites';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_WALK_MAP_ID,
} from '../../rocco-default-constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';
import type { RoccoLocalization } from '../../localization';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../rocco-level-types';
import { netherResetOfficeSecondAssetUrls } from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID = 'nether-reset-office-second';
export const ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID =
  'rocco-nether-reset-office-second-scene';

const NETHER_RESET_OFFICE_RETURN_CONNECTOR_ID = 'south';
const NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_RESET_OFFICE_PRINTER_SPRITE_DEFINITION_ID = 'rocco-nether-reset-office-printer';
const NETHER_RESET_OFFICE_PRINTER_SPRITE_INSTANCE_ID =
  'rocco-nether-reset-office-printer-instance';
const NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ID =
  'rocco-nether-reset-office-printer-action-menu';
const NETHER_RESET_OFFICE_PRINTER_FRAME_ID_PREFIX = 'rocco-nether-reset-office-printer-frame';
const NETHER_RESET_OFFICE_PRINTER_IMAGE_ID_PREFIX = 'rocco-nether-reset-office-printer-image';
const NETHER_RESET_OFFICE_PRINTER_IDLE_ACTION_ID = 'idle';
const NETHER_RESET_OFFICE_PRINTER_MESSAGE_TTL_MS = 5200;
const NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_RESET_OFFICE_ENTRY_POSITION = {
  x: 371,
  y: 138,
} as const;
const NETHER_RESET_OFFICE_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.8;
const NETHER_RESET_OFFICE_ROCCO_TINT = '#cccccc';
const NETHER_RESET_OFFICE_FAR_SCALE = 0.8;
const NETHER_RESET_OFFICE_PRINTER_TINT = '#cccccc';
const NETHER_RESET_OFFICE_PRINTER_POSITION = {
  x: 28,
  y: 200,
} as const;
const NETHER_RESET_OFFICE_PRINTER_SCALE = 0.6732;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT = {
  x: 371,
  y: DEFAULT_DESIGN_HEIGHT - 22,
} as const;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_SCALE,
);

const NETHER_RESET_OFFICE_SECOND_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_RESET_OFFICE_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
      height: NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION,
    },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
] as const;

const NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_RESET_OFFICE_SECOND_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-reset-office-second-backplate',
    background: 'rocco-nether-reset-office-second-background',
  },
  backgroundUri: netherResetOfficeSecondAssetUrls.background,
  backgroundName: 'Nether Reset Office Second Background',
};

const netherResetOfficePrinterAssetUrls = [
  new URL('./assets/printer/1.png', import.meta.url).href,
  new URL('./assets/printer/2.png', import.meta.url).href,
  new URL('./assets/printer/3.png', import.meta.url).href,
  new URL('./assets/printer/4.png', import.meta.url).href,
  new URL('./assets/printer/5.png', import.meta.url).href,
] as const;

interface ResetOfficePrinterText {
  description: string;
  lookLines: string[];
  grabLines: string[];
  kickLines: string[];
}

const NETHER_RESET_OFFICE_PRINTER_TEXT_BY_LOCALE: Record<string, ResetOfficePrinterText> = {
  en: {
    description: 'Printer',
    lookLines: ['A printer. Even the Nether has paperwork.'],
    grabLines: ["I'm not carrying an office printer around."],
    kickLines: ['Kicking the printer feels like signing up for more forms.'],
  },
  es: {
    description: 'Impresora',
    lookLines: ['Una impresora. Hasta en el Nether hay papeleo.'],
    grabLines: ['No voy a cargar con una impresora de oficina.'],
    kickLines: ['Patear la impresora suena a rellenar todavia mas formularios.'],
  },
};

function resolveResetOfficePrinterText(localization: RoccoLocalization): ResetOfficePrinterText {
  return (
    NETHER_RESET_OFFICE_PRINTER_TEXT_BY_LOCALE[localization.locale] ??
    NETHER_RESET_OFFICE_PRINTER_TEXT_BY_LOCALE.en
  );
}

function makePrinterMessageResult(text: string[], historyKey: string) {
  return {
    kind: 'sprite-message' as const,
    message: {
      spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      mode: 'think' as const,
      text,
      lineSelection: {
        mode: 'random' as const,
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
      ttlMs: NETHER_RESET_OFFICE_PRINTER_MESSAGE_TTL_MS,
    },
  };
}

async function createResetOfficePrinterSpriteDefinition(
  localization: RoccoLocalization,
): Promise<RoccoSpriteDefinition> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'image-list',
    sources: netherResetOfficePrinterAssetUrls.map((uri, index) => ({
      id: `${NETHER_RESET_OFFICE_PRINTER_IMAGE_ID_PREFIX}-${index + 1}`,
      uri,
    })),
    frameIdPrefix: NETHER_RESET_OFFICE_PRINTER_FRAME_ID_PREFIX,
    durationMs: 1000,
    alphaThreshold: 1,
    padding: 0,
    pivot: { mode: 'absolute', x: 0, y: 0 },
    hitbox: 'rect',
  });
  const printerText = resolveResetOfficePrinterText(localization);
  const idleFrameId =
    crop.frameIds[4] ??
    crop.frameIds.at(-1) ??
    `${NETHER_RESET_OFFICE_PRINTER_FRAME_ID_PREFIX}-5`;

  return {
    id: NETHER_RESET_OFFICE_PRINTER_SPRITE_DEFINITION_ID,
    name: 'Reset Office Printer',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [NETHER_RESET_OFFICE_PRINTER_IDLE_ACTION_ID]: {
        id: NETHER_RESET_OFFICE_PRINTER_IDLE_ACTION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: idleFrameId, durationMs: 1000 }],
      },
    },
    defaultAnimation: NETHER_RESET_OFFICE_PRINTER_IDLE_ACTION_ID,
    render: {
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: printerText.description,
    },
    metadata: {
      purpose: 'reset-office-printer',
    },
  };
}

function createResetOfficePrinterActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  const printerText = resolveResetOfficePrinterText(localization);
  return {
    id: NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_RESET_OFFICE_PRINTER_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
        result: makePrinterMessageResult(printerText.lookLines, 'reset-office-printer-look'),
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
        result: makePrinterMessageResult(printerText.grabLines, 'reset-office-printer-grab'),
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
        result: makePrinterMessageResult(printerText.kickLines, 'reset-office-printer-kick'),
      },
    ],
  };
}

export class RoccoNetherResetOfficeSecondLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_RESET_OFFICE_SECOND_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private spriteController: RoccoDefaultSpriteController | null = null;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = localization.text.levels.resetOfficeTitle;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_RESET_OFFICE_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const scene = await loadOrCreateNetherScene(engine, NETHER_RESET_OFFICE_SECOND_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherResetOfficeSecondAssetUrls.walkPath);
    const printerDefinition = await createResetOfficePrinterSpriteDefinition(this.localization);

    await engine.video.preloadPlaneScene(scene);
    await engine.video.preloadSpriteDefinition(printerDefinition);
    engine.loadPlaneScene(scene);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    engine.video.sprites.loadSpriteDefinition(printerDefinition);
    this.spriteController = await installDefaultSprite(engine, {
      initialFacing,
      initialPosition: { ...initialPosition },
      scale: NETHER_RESET_OFFICE_ROCCO_SCALE,
      tint: NETHER_RESET_OFFICE_ROCCO_TINT,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: {
        farY: walkMapProfile.farY,
        nearY: walkMapProfile.nearY,
        farScale: NETHER_RESET_OFFICE_FAR_SCALE,
        nearScale: 1,
        scaleCurve: 'linear',
      },
    });
    engine.video.sprites.createSpriteFromDefinition(NETHER_RESET_OFFICE_PRINTER_SPRITE_DEFINITION_ID, {
      id: NETHER_RESET_OFFICE_PRINTER_SPRITE_INSTANCE_ID,
      transform: {
        x: NETHER_RESET_OFFICE_PRINTER_POSITION.x,
        y: NETHER_RESET_OFFICE_PRINTER_POSITION.y,
        scaleX: NETHER_RESET_OFFICE_PRINTER_SCALE,
        scaleY: NETHER_RESET_OFFICE_PRINTER_SCALE,
        rotation: 0,
      },
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      interactive: true,
      collisionEnabled: false,
      tint: NETHER_RESET_OFFICE_PRINTER_TINT,
    });
    engine.video.actionMenus.registerMenu(
      createResetOfficePrinterActionMenuDefinition(this.localization),
    );
    engine.video.render(0);

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.actionMenus.unregisterMenu(NETHER_RESET_OFFICE_PRINTER_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(NETHER_RESET_OFFICE_PRINTER_SPRITE_INSTANCE_ID);
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.spriteController = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
  }

  handleAction(): void {}
}
