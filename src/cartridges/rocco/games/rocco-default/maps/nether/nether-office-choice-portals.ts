import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoPoint } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import type { RoccoLocalization } from '../../localization';
import {
  createNetherArrivalPortalSpriteDefinition,
  NETHER_ARRIVAL_PORTAL_DEFINITION_ID,
  NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
} from './nether-arrival-effects';
import { toOriginFromGroundPoint } from './nether-level-support';
import { startNetherResetOfficeGuyspriteArrival } from './nether-office-arrival-support';

const NETHER_OFFICE_CHOICE_PORTAL_TARGET_HEIGHT = 64;
const NETHER_OFFICE_CHOICE_PORTAL_WAIT_MS = 250;
const NETHER_OFFICE_CHOICE_PORTAL_MOVE_SPEED = GUYSPRITE_CONFIG.motion.runSpeed * 1.5;

const PORTALS = [
  {
    instanceId: 'rocco-nether-office-game-portal',
    choice: 'game',
    x: 228,
  },
  {
    instanceId: 'rocco-nether-office-console-cpu-portal',
    choice: 'console',
    x: 705,
  },
] as const;

export type NetherOfficePortalChoice = (typeof PORTALS)[number]['choice'];

export class NetherOfficeChoicePortalController {
  private readonly gamePortalLabel: string;
  private readonly consoleCpuPortalLabel: string;
  private portalScale = 1;
  private portalWidth = 64;
  private prepared = false;
  private engine: CartridgeSdkV1Runtime | undefined;
  private sequencePhase: 'idle' | 'moving-to' | 'waiting' | 'moving-home' = 'idle';
  private waitElapsedMs = 0;
  private movementInputLease: { dispose(): void } | undefined;
  private onComplete: (() => void) | undefined;
  private homeGroundPoint: RoccoPoint = { x: 0, y: 0 };
  private guyspriteScale = 1;

  constructor(localization: RoccoLocalization) {
    this.gamePortalLabel = localization.text.nether.officeReading.gamePortalLabel;
    this.consoleCpuPortalLabel = localization.text.nether.officeReading.consoleCpuPortalLabel;
  }

  async prepare(
    engine: CartridgeSdkV1Runtime,
    preloader: RoccoAssetPreloader | undefined,
  ): Promise<void> {
    const portal = await createNetherArrivalPortalSpriteDefinition();
    await (preloader?.preloadSpriteDefinition(engine, portal.definition) ??
      engine.video.preloadSpriteDefinition(portal.definition));
    engine.video.sprites.loadSpriteDefinition(portal.definition);
    this.portalScale = Math.max(
      0.01,
      NETHER_OFFICE_CHOICE_PORTAL_TARGET_HEIGHT / Math.max(1, portal.initialFrameHeight),
    );
    this.portalWidth = Math.max(48, portal.initialFrameWidth * this.portalScale);
    this.prepared = true;
  }

  getChoiceAt(sceneX: number, sceneY: number): NetherOfficePortalChoice | undefined {
    if (this.engine) {
      const visibleHit = this.engine.video.sprites
        .hitTestVisiblePixel(sceneX, sceneY)
        .find((hit) => PORTALS.some((portal) => portal.instanceId === hit.instanceId));
      if (visibleHit) {
        return PORTALS.find((portal) => portal.instanceId === visibleHit.instanceId)?.choice;
      }
      return undefined;
    }

    if (sceneY < 507 - NETHER_OFFICE_CHOICE_PORTAL_TARGET_HEIGHT || sceneY > 507) {
      return undefined;
    }

    const portal = PORTALS.find(
      (candidate) => Math.abs(sceneX - candidate.x) <= this.portalWidth / 2,
    );
    return portal?.choice;
  }

  show(engine: CartridgeSdkV1Runtime): void {
    if (!this.prepared) {
      return;
    }

    for (const [index, portal] of PORTALS.entries()) {
      const label = index === 0 ? this.gamePortalLabel : this.consoleCpuPortalLabel;
      engine.video.sprites.removeSprite(portal.instanceId);
      engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_PORTAL_DEFINITION_ID, {
        id: portal.instanceId,
        transform: {
          x: portal.x,
          y: 507,
          scaleX: this.portalScale,
          scaleY: this.portalScale,
          rotation: 0,
        },
        renderLayer: 'world.front',
        zIndex: 21,
        depthMode: 'fixed',
        interactive: false,
        collisionEnabled: false,
        visibleDescription: { enabled: true, text: label },
        ignoreMessages: true,
      });
      engine.video.sprites.playAnimation(
        portal.instanceId,
        NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
        { restart: true },
      );
    }
  }

  begin(
    engine: CartridgeSdkV1Runtime,
    guyspriteScale: number,
    homeGroundPoint: RoccoPoint,
    onComplete: () => void,
  ): void {
    this.engine = engine;
    this.onComplete = onComplete;
    this.guyspriteScale = guyspriteScale;
    this.homeGroundPoint = homeGroundPoint;
    this.sequencePhase = 'moving-to';
    this.waitElapsedMs = 0;
    this.movementInputLease = engine.acquireInputLease(
      'nether-office-identity-guysprite-portals',
      'blocked',
    );
    engine.video.sprites.playAction(
      GUYSPRITE_CONFIG.ids.instance,
      GUYSPRITE_CONFIG.ids.idleAction,
      { direction: 'right', restart: true },
    );
    startNetherResetOfficeGuyspriteArrival(
      engine,
      toOriginFromGroundPoint({ x: 712, y: 461 }, guyspriteScale),
      NETHER_OFFICE_CHOICE_PORTAL_MOVE_SPEED,
    );
  }

  update(deltaMs: number): void {
    if (!this.engine || this.sequencePhase === 'idle') {
      return;
    }

    if (this.sequencePhase === 'moving-to') {
      if (this.engine.video.sprites.isMoving(GUYSPRITE_CONFIG.ids.instance)) return;
      this.show(this.engine);
      this.sequencePhase = 'waiting';
      this.waitElapsedMs = 0;
      return;
    }

    if (this.sequencePhase === 'waiting') {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
      this.waitElapsedMs += deltaMs;
      if (this.waitElapsedMs < NETHER_OFFICE_CHOICE_PORTAL_WAIT_MS) return;
      this.sequencePhase = 'moving-home';
      this.engine.video.sprites.playAction(
        GUYSPRITE_CONFIG.ids.instance,
        GUYSPRITE_CONFIG.ids.idleAction,
        { direction: 'left', restart: true },
      );
      startNetherResetOfficeGuyspriteArrival(
        this.engine,
        toOriginFromGroundPoint(this.homeGroundPoint, this.guyspriteScale),
        NETHER_OFFICE_CHOICE_PORTAL_MOVE_SPEED,
      );
      return;
    }

    if (this.engine.video.sprites.isMoving(GUYSPRITE_CONFIG.ids.instance)) return;
    this.movementInputLease?.dispose();
    this.movementInputLease = undefined;
    this.sequencePhase = 'idle';
    this.onComplete?.();
    this.onComplete = undefined;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.movementInputLease?.dispose();
    this.movementInputLease = undefined;
    this.sequencePhase = 'idle';
    this.onComplete = undefined;
    for (const portal of PORTALS) {
      engine.video.sprites.removeSprite(portal.instanceId);
    }
    if (this.prepared) {
      engine.video.sprites.unregisterSpriteDefinition(NETHER_ARRIVAL_PORTAL_DEFINITION_ID);
      this.prepared = false;
    }
  }
}
