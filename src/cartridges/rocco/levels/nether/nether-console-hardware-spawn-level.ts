import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../../engine/video/sprites';
import type { RoccoLocalization } from '../../localization';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_WALK_MAP_ID,
} from '../../rocco-default-constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../rocco-level-types';
import { netherAmbientSteamMachineAssetUrl, netherConsoleHardwareSpawnAssetUrls } from './nether-assets';
import {
  createNetherArrivalPortalSpriteDefinition,
  createNetherArrivalSmokeSpriteDefinition,
  NETHER_ARRIVAL_PORTAL_DEFINITION_ID,
  NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS,
  NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
  NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID,
  NETHER_ARRIVAL_PORTAL_LOOP_SOUND_URL,
  NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
  NETHER_ARRIVAL_SMOKE_DEFINITION_ID,
  NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS,
  NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
  NETHER_ARRIVAL_SPELL_SOUND_ID,
  NETHER_ARRIVAL_SPELL_SOUND_URL,
} from './nether-arrival-effects';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  projectOriginToWalkMap,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID = 'nether-console-hardware-spawn';
export const ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID =
  'rocco-nether-console-hardware-spawn-scene';

const NETHER_ENTRY_CONNECTOR_ID = 'entry';
const NETHER_FORWARD_CONNECTOR_ID = 'north';
const NETHER_AMBIENT_SOUND_ID = 'rocco-nether-steam-machine-ambient-sound';
const NETHER_AMBIENT_SOUND_VOLUME = 0.2;
const NETHER_AMBIENT_SOUND_LEFT_BONUS = 0.05;
const NETHER_AMBIENT_SOUND_VOLUME_UPDATE_EPSILON = 0.001;
const NETHER_LIGHTS_PLANE_ID = 'rocco-nether-console-hardware-spawn-lights';
const NETHER_ROCCO_SCALE = ((DEFAULT_SPRITE_SCALE * 1.2 * 1.8) / 2) * 1.2 * 1.1;
const NETHER_ROCCO_TINT = '#b3b3b3';
const NETHER_ROCCO_CONTRAST = 1.2;
const NETHER_ROCCO_CONTRAST_RESPONSE = 0.25;
const NETHER_RIGHT_FAR_SCALE = 0.1375;
const NETHER_LEFT_FAR_SCALE = 0.275;
const NETHER_SCALE_START_HEIGHT_FROM_BOTTOM = 100;
const NETHER_SCALE_START_Y = DEFAULT_DESIGN_HEIGHT - NETHER_SCALE_START_HEIGHT_FROM_BOTTOM;
const NETHER_FORWARD_TRIGGER_Y = Math.round(DEFAULT_DESIGN_HEIGHT / 2) + 50;
const NETHER_SCALE_LEFT_REGION = {
  x: 0,
  y: 0,
  width: DEFAULT_DESIGN_WIDTH / 2,
  height: DEFAULT_DESIGN_HEIGHT,
} as const;
const NETHER_SCALE_RIGHT_REGION = {
  x: DEFAULT_DESIGN_WIDTH / 2,
  y: 0,
  width: DEFAULT_DESIGN_WIDTH / 2,
  height: DEFAULT_DESIGN_HEIGHT,
} as const;
const NETHER_ENTRY_GROUND_POINT = {
  x: Math.round(DEFAULT_DESIGN_WIDTH * 0.5),
  y: Math.round(DEFAULT_DESIGN_HEIGHT * 0.72),
} as const;
const NETHER_ARRIVAL_ROCCO_GROUND_POINT = {
  x: 851,
  y: 452,
} as const;
const NETHER_ENTRY_POSITION = {
  x: Math.round(NETHER_ENTRY_GROUND_POINT.x - DEFAULT_SPRITE_GROUND_ANCHOR_X * NETHER_ROCCO_SCALE),
  y: Math.round(NETHER_ENTRY_GROUND_POINT.y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * NETHER_ROCCO_SCALE),
} as const;
const NETHER_ARRIVAL_ROCCO_POSITION = toOriginFromGroundPoint(
  NETHER_ARRIVAL_ROCCO_GROUND_POINT,
  NETHER_ROCCO_SCALE,
);
const NETHER_FORWARD_RETURN_GROUND_POINT = {
  x: 738,
  y: NETHER_FORWARD_TRIGGER_Y,
} as const;
const NETHER_FORWARD_RETURN_POSITION = toOriginFromGroundPoint(
  NETHER_FORWARD_RETURN_GROUND_POINT,
  NETHER_ROCCO_SCALE,
);
const NETHER_ARRIVAL_PORTAL_TARGET_HEIGHT = 64.8;
const NETHER_ARRIVAL_SMOKE_TARGET_HEIGHT = 125;
const NETHER_ARRIVAL_THOUGHT_TTL_MS = 3600;
const NETHER_ARRIVAL_PORTAL_LOOP_SOUND_VOLUME = 0.5;
const NETHER_ARRIVAL_SPELL_SOUND_VOLUME = 0.42;
const NETHER_ARRIVAL_PORTAL_OPEN_FRAME_COUNT = 8;
const NETHER_LIGHTS_MIN_OPACITY = 0;
const NETHER_LIGHTS_NOISE_MAX_OPACITY = 0.15;
const NETHER_LIGHTS_NOISE_STEP_MIN_MS = 70;
const NETHER_LIGHTS_NOISE_STEP_MAX_MS = 220;
const NETHER_LIGHTS_NOISE_SMOOTHING_MS = 120;
const NETHER_LIGHTS_PULSE_UPDATE_EPSILON = 0.001;
const NETHER_BACKGROUND_BASE_CONTRAST = 1;
const NETHER_BACKGROUND_CONTRAST_RESPONSE = 0.25;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min);
}

type NetherArrivalSequencePhase = 'opening-portal' | 'smoke' | 'spawning-rocco';

interface NetherArrivalSequence {
  phase: NetherArrivalSequencePhase;
  elapsedMs: number;
  smokeFrameIndex: number;
}

const NETHER_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_ENTRY_CONNECTOR_ID,
    entryPoint: { ...NETHER_ENTRY_POSITION },
    entryFacing: 'down',
  },
  {
    id: NETHER_FORWARD_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: NETHER_FORWARD_TRIGGER_Y,
    },
    entryPoint: { ...NETHER_FORWARD_RETURN_POSITION },
    entryFacing: 'down',
  },
] as const;

const NETHER_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-console-hardware-spawn-backplate',
    background: 'rocco-nether-console-hardware-spawn-background',
  },
  backgroundUri: netherConsoleHardwareSpawnAssetUrls.background,
  backgroundName: 'Nether Console Hardware Spawn Background',
  extraPlanes: [
    {
      id: NETHER_LIGHTS_PLANE_ID,
      name: 'Nether Console Hardware Spawn Lights',
      enabled: true,
      visible: true,
      source: {
        kind: 'image',
        uri: netherConsoleHardwareSpawnAssetUrls.lights,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      colorModel: { kind: 'native' },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      opacity: NETHER_LIGHTS_MIN_OPACITY,
      blendMode: 'multiply',
      occludesInput: false,
      priority: 0,
      renderLayer: 'foreground',
    },
  ],
};

export class RoccoNetherConsoleHardwareSpawnLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private engine: RoccoEngine | null = null;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private arrivalSequence: NetherArrivalSequence | null = null;
  private arrivalSequencePlayed = false;
  private perspectiveFarY = 0;
  private smokeScale = 1;
  private portalScale = 1;
  private smokeFrameCount = 0;
  private ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
  private lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetRemainingMs = 0;
  private sceneReady = false;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = 'Nether';
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = null;
    this.arrivalSequence = null;
    this.perspectiveFarY = 0;
    this.smokeScale = 1;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = randomBetween(NETHER_LIGHTS_MIN_OPACITY, NETHER_LIGHTS_NOISE_MAX_OPACITY);
    this.lightsNoiseTargetOpacity = this.lightsNoiseOpacity;
    this.lightsNoiseTargetRemainingMs = randomBetween(
      NETHER_LIGHTS_NOISE_STEP_MIN_MS,
      NETHER_LIGHTS_NOISE_STEP_MAX_MS,
    );
    this.sceneReady = false;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const isReturningFromNetherTwo = entryConnector?.id === NETHER_FORWARD_CONNECTOR_ID;
    const shouldPlayArrivalSequence =
      entryConnector?.id === NETHER_ENTRY_CONNECTOR_ID && !this.arrivalSequencePlayed;
    const initialPosition = isReturningFromNetherTwo
      ? { ...NETHER_FORWARD_RETURN_POSITION }
      : entryConnector
        ? {
            x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
            y: entryConnector.entryPoint.y,
          }
        : { ...NETHER_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'down';
    const scene = await loadOrCreateNetherScene(engine, NETHER_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherConsoleHardwareSpawnAssetUrls.walkPath);
    this.perspectiveFarY = walkMapProfile.farY;

    const [smokeSprite, portalSprite] = shouldPlayArrivalSequence
      ? await Promise.all([
          createNetherArrivalSmokeSpriteDefinition(),
          createNetherArrivalPortalSpriteDefinition(),
        ])
      : [null, null];

    await engine.video.preloadPlaneScene(scene);
    engine.audio.registerSound({
      id: NETHER_AMBIENT_SOUND_ID,
      uri: netherAmbientSteamMachineAssetUrl,
      volume: NETHER_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
    if (smokeSprite && portalSprite) {
      await Promise.all([
        engine.video.preloadSpriteDefinition(smokeSprite.definition),
        engine.video.preloadSpriteDefinition(portalSprite.definition),
      ]);
    }
    engine.loadPlaneScene(scene);
    this.lightsOverlayOpacity = this.lightsNoiseOpacity;
    engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_LIGHTS_PLANE_ID,
      {
        opacity: this.lightsOverlayOpacity,
      },
    );
    engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_SCENE_DEFINITION.planeIds.background,
      {
        contrast:
          NETHER_BACKGROUND_BASE_CONTRAST +
          this.lightsOverlayOpacity * NETHER_BACKGROUND_CONTRAST_RESPONSE,
      },
    );
    this.updateRoccoLightContrast(this.lightsOverlayOpacity);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    await engine.audio.preloadSound(NETHER_AMBIENT_SOUND_ID).catch(() => {
      engine.log('Audio', 'Nether ambient steam machine sound could not be preloaded.');
    });
    engine.audio.playSound(NETHER_AMBIENT_SOUND_ID, {
      restart: true,
      volume: this.ambientSoundVolume,
      loop: true,
    });

    if (smokeSprite && portalSprite) {
      engine.audio.registerSound({
        id: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID,
        uri: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_URL,
        volume: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_VOLUME,
        loop: true,
      });
      engine.audio.registerSound({
        id: NETHER_ARRIVAL_SPELL_SOUND_ID,
        uri: NETHER_ARRIVAL_SPELL_SOUND_URL,
        volume: NETHER_ARRIVAL_SPELL_SOUND_VOLUME,
        loop: false,
      });
      await Promise.all([
        engine.audio.preloadSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID).catch(() => {
          engine.log('Audio', 'Nether arrival portal loop sound could not be preloaded.');
        }),
        engine.audio.preloadSound(NETHER_ARRIVAL_SPELL_SOUND_ID).catch(() => {
          engine.log('Audio', 'Nether arrival spell sound could not be preloaded.');
        }),
      ]);
      engine.video.sprites.loadSpriteDefinition(smokeSprite.definition);
      engine.video.sprites.loadSpriteDefinition(portalSprite.definition);
      engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
      engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
      this.smokeScale = Math.max(
        0.01,
        NETHER_ARRIVAL_SMOKE_TARGET_HEIGHT / Math.max(1, smokeSprite.initialFrameHeight),
      );
      this.portalScale = Math.max(
        0.01,
        NETHER_ARRIVAL_PORTAL_TARGET_HEIGHT / Math.max(1, portalSprite.initialFrameHeight),
      );
      this.smokeFrameCount = smokeSprite.frameCount;
      engine.setInputEnabled(false);
      this.startArrivalSequence();
    } else {
      this.spriteController = await this.installNetherSprite(
        engine,
        initialFacing,
        isReturningFromNetherTwo
          ? { ...initialPosition }
          : projectOriginToWalkMap(walkMapProfile.walkMap, initialPosition, NETHER_ROCCO_SCALE),
      );
    }
    engine.video.render(0);
    this.sceneReady = true;

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.audio.stopSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.engine = null;
    this.spriteController = null;
    this.arrivalSequence = null;
    this.perspectiveFarY = 0;
    this.smokeScale = 1;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetRemainingMs = 0;
    this.sceneReady = false;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.updateLightsOverlay(deltaMs);
    this.updateAmbientSoundVolume();

    if (this.arrivalSequence) {
      this.updateArrivalSequence(deltaMs);
      return;
    }

    this.spriteController?.update(deltaMs);
  }

  handleAction(_activation: RoccoActionMenuActivation): void {}

  handleSceneClick(_activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {}

  private updateAmbientSoundVolume(): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const x = sprite?.transform.x ?? DEFAULT_DESIGN_WIDTH;
    const clampedX = Math.min(DEFAULT_DESIGN_WIDTH, Math.max(0, x));
    const leftness = 1 - clampedX / DEFAULT_DESIGN_WIDTH;
    const nextVolume = NETHER_AMBIENT_SOUND_VOLUME + leftness * NETHER_AMBIENT_SOUND_LEFT_BONUS;

    if (Math.abs(nextVolume - this.ambientSoundVolume) < NETHER_AMBIENT_SOUND_VOLUME_UPDATE_EPSILON) {
      return;
    }

    this.ambientSoundVolume = nextVolume;
    this.engine.audio.setSoundVolume(NETHER_AMBIENT_SOUND_ID, nextVolume);
  }

  private updateRoccoLightContrast(lightOpacity: number): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return;
    }

    const nextContrast = NETHER_ROCCO_CONTRAST + lightOpacity * NETHER_ROCCO_CONTRAST_RESPONSE;
    if (Math.abs((sprite.contrast ?? 1) - nextContrast) < NETHER_LIGHTS_PULSE_UPDATE_EPSILON) {
      return;
    }

    this.engine.video.sprites.setContrast(DEFAULT_SPRITE_INSTANCE_ID, nextContrast);
  }

  private updateLightsOverlay(deltaMs: number): void {
    if (!this.engine || !this.sceneReady || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (
      !this.engine.video.planes.resolvePlane(
        ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
        NETHER_LIGHTS_PLANE_ID,
      )
    ) {
      return;
    }

    this.lightsNoiseTargetRemainingMs -= deltaMs;
    if (this.lightsNoiseTargetRemainingMs <= 0) {
      this.lightsNoiseTargetOpacity = randomBetween(
        NETHER_LIGHTS_MIN_OPACITY,
        NETHER_LIGHTS_NOISE_MAX_OPACITY,
      );
      this.lightsNoiseTargetRemainingMs = randomBetween(
        NETHER_LIGHTS_NOISE_STEP_MIN_MS,
        NETHER_LIGHTS_NOISE_STEP_MAX_MS,
      );
    }

    const noiseBlend = clampUnit(deltaMs / NETHER_LIGHTS_NOISE_SMOOTHING_MS);
    this.lightsNoiseOpacity +=
      (this.lightsNoiseTargetOpacity - this.lightsNoiseOpacity) * noiseBlend;

    const nextOpacity = this.lightsNoiseOpacity;

    if (Math.abs(nextOpacity - this.lightsOverlayOpacity) < NETHER_LIGHTS_PULSE_UPDATE_EPSILON) {
      return;
    }

    this.lightsOverlayOpacity = nextOpacity;
    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_LIGHTS_PLANE_ID,
      {
        opacity: nextOpacity,
      },
    );
    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_SCENE_DEFINITION.planeIds.background,
      {
        contrast:
          NETHER_BACKGROUND_BASE_CONTRAST + nextOpacity * NETHER_BACKGROUND_CONTRAST_RESPONSE,
      },
    );
    this.updateRoccoLightContrast(nextOpacity);
  }

  private async installNetherSprite(
    engine: RoccoEngine,
    initialFacing: RoccoFacingDirection,
    initialPosition: RoccoPoint,
  ): Promise<RoccoDefaultSpriteController> {
    return installDefaultSprite(engine, {
      initialFacing,
      initialPosition,
      scale: NETHER_ROCCO_SCALE,
      tint: NETHER_ROCCO_TINT,
      contrast: NETHER_ROCCO_CONTRAST,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: {
        farY: this.perspectiveFarY,
        nearY: NETHER_SCALE_START_Y,
        farScale: NETHER_RIGHT_FAR_SCALE,
        nearScale: 1,
        scaleCurve: 'linear',
        speedScale: true,
        speedScaleMode: 'vertical-only',
        regions: [
          {
            region: NETHER_SCALE_LEFT_REGION,
            farScale: NETHER_LEFT_FAR_SCALE,
          },
          {
            region: NETHER_SCALE_RIGHT_REGION,
            farScale: NETHER_RIGHT_FAR_SCALE,
          },
        ],
      },
    });
  }

  private startArrivalSequence(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.setPlayerSprite(null);
    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_PORTAL_DEFINITION_ID, {
      id: NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
      transform: {
        x: NETHER_ARRIVAL_ROCCO_GROUND_POINT.x,
        y: NETHER_ARRIVAL_ROCCO_GROUND_POINT.y,
        scaleX: this.portalScale,
        scaleY: this.portalScale,
        rotation: 0,
      },
      renderLayer: 'world.front',
      zIndex: 21,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      ignoreMessages: true,
    });
    this.engine.video.sprites.playAnimation(
      NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
      NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    this.engine.audio.playSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    this.arrivalSequence = {
      phase: 'opening-portal',
      elapsedMs: 0,
      smokeFrameIndex: 0,
    };
    this.engine.video.render(0);
  }

  private updateArrivalSequence(deltaMs: number): void {
    if (!this.engine || !this.arrivalSequence || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.arrivalSequence.phase === 'spawning-rocco') {
      return;
    }

    if (this.arrivalSequence.phase === 'opening-portal') {
      const nextElapsedMs = this.arrivalSequence.elapsedMs + deltaMs;
      this.arrivalSequence = {
        ...this.arrivalSequence,
        elapsedMs: nextElapsedMs,
      };
      if (
        nextElapsedMs <
        NETHER_ARRIVAL_PORTAL_OPEN_FRAME_COUNT * NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS
      ) {
        return;
      }

      this.spawnArrivalSmokeSprite();
      this.engine.audio.playSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
      this.arrivalSequence = {
        phase: 'smoke',
        elapsedMs: 0,
        smokeFrameIndex: 0,
      };
      return;
    }

    const nextElapsedMs = this.arrivalSequence.elapsedMs + deltaMs;
    const nextFrameIndex = Math.min(
      Math.max(0, this.smokeFrameCount - 1),
      Math.floor(nextElapsedMs / NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS),
    );
    if (nextFrameIndex !== this.arrivalSequence.smokeFrameIndex) {
      this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, nextFrameIndex);
    }
    this.arrivalSequence = {
      ...this.arrivalSequence,
      elapsedMs: nextElapsedMs,
      smokeFrameIndex: nextFrameIndex,
    };

    if (nextElapsedMs < this.smokeFrameCount * NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS) {
      return;
    }

    this.arrivalSequence = {
      phase: 'spawning-rocco',
      elapsedMs: nextElapsedMs,
      smokeFrameIndex: nextFrameIndex,
    };
    void this.finishArrivalSequence();
  }

  private spawnArrivalSmokeSprite(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_SMOKE_DEFINITION_ID, {
      id: NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
      transform: {
        x: NETHER_ARRIVAL_ROCCO_GROUND_POINT.x,
        y: NETHER_ARRIVAL_ROCCO_GROUND_POINT.y,
        scaleX: this.smokeScale,
        scaleY: this.smokeScale,
        rotation: 0,
      },
      renderLayer: 'world.front',
      zIndex: 22,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      ignoreMessages: true,
    });
    this.engine.video.sprites.stopAnimation(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, 0);
    this.engine.video.render(0);
  }

  private async finishArrivalSequence(): Promise<void> {
    if (!this.engine) {
      return;
    }

    const engine = this.engine;
    engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);

    try {
      this.spriteController = await this.installNetherSprite(engine, 'down-left', {
        ...NETHER_ARRIVAL_ROCCO_POSITION,
      });
      engine.video.sprites.setPosition(
        DEFAULT_SPRITE_INSTANCE_ID,
        NETHER_ARRIVAL_ROCCO_POSITION.x,
        NETHER_ARRIVAL_ROCCO_POSITION.y,
        {
          constrainToWalkMap: false,
        },
      );
      engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
        direction: 'down-left',
        restart: true,
      });
      engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, this.resolveArrivalThoughtLine(), {
        ttlMs: NETHER_ARRIVAL_THOUGHT_TTL_MS,
      });
      this.arrivalSequencePlayed = true;
    } catch (error) {
      engine.log('System', `Nether arrival sequence failed: ${String(error)}`);
    } finally {
      engine.setInputEnabled(true);
      this.arrivalSequence = null;
      engine.video.render(0);
    }
  }

  private resolveArrivalThoughtLine(): string {
    if (this.localization.locale === 'es') {
      return '\u00bfqu\u00e9 es este lugar?';
    }

    return 'What is this place?';
  }
}
