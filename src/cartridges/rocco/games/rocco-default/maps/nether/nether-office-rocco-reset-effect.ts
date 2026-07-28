import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import {
  applyRoccoPlayerAppearance,
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_PLAYER_CONFIG,
} from '../../player';
import type { RoccoLocalization } from '../../localization';
import {
  createNetherArrivalSmokeSpriteDefinition,
  NETHER_ARRIVAL_SMOKE_ANIMATION_ID,
  NETHER_ARRIVAL_SMOKE_DEFINITION_ID,
  NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS,
  NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
  NETHER_ARRIVAL_SPELL_SOUND_ID,
  NETHER_ARRIVAL_SPELL_SOUND_URL,
} from './nether-arrival-effects';

const SMOKE_TARGET_HEIGHT = 125;
const SPELL_SOUND_VOLUME = 0.42;

interface NetherOfficeRoccoResetSequence {
  elapsedMs: number;
}

export class NetherOfficeRoccoResetEffect {
  private readonly localization: RoccoLocalization;
  private engine: CartridgeSdkV1Runtime | undefined;
  private sequence: NetherOfficeRoccoResetSequence | undefined;
  private onComplete: (() => void) | undefined;
  private smokeFrameCount = 0;
  private smokeScale = 1;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
  }

  private async prepareSmoke(): Promise<void> {
    if (!this.engine) {
      return;
    }

    try {
      let spriteDefinition = this.engine.video.sprites.getSpriteDefinition(
        NETHER_ARRIVAL_SMOKE_DEFINITION_ID,
      );
      if (!spriteDefinition) {
        const smoke = await createNetherArrivalSmokeSpriteDefinition();
        if (!this.engine) {
          return;
        }
        await this.engine.video.preloadSpriteDefinition(smoke.definition);
        this.engine.video.sprites.loadSpriteDefinition(smoke.definition);
        spriteDefinition = smoke.definition;
      }

      const animationFrames =
        spriteDefinition.animations[NETHER_ARRIVAL_SMOKE_ANIMATION_ID]?.frames ?? [];
      const initialFrameHeight = spriteDefinition.frames[0]?.rect?.height ?? 1;
      this.smokeFrameCount = animationFrames.length || spriteDefinition.frames.length;
      this.smokeScale = SMOKE_TARGET_HEIGHT / Math.max(1, initialFrameHeight);
      const rocco = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
      if (!rocco || this.smokeFrameCount === 0) {
        this.smokeFrameCount = 1;
        return;
      }

      this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
      this.engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_SMOKE_DEFINITION_ID, {
        id: NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
        transform: {
          x: rocco.transform.x + ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * rocco.transform.scaleX,
          y: rocco.transform.y + ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * rocco.transform.scaleY,
          scaleX: this.smokeScale,
          scaleY: this.smokeScale,
          rotation: 0,
        },
        renderLayer: 'world.front',
        zIndex: 1000,
        depthMode: 'fixed',
        interactive: false,
        collisionEnabled: false,
        ignoreMessages: true,
      });
      this.engine.video.sprites.stopAnimation(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
      this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, 0);
    } catch {
      this.smokeFrameCount = 1;
    }
  }

  get isActive(): boolean {
    return this.sequence !== undefined;
  }

  mount(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    engine.audio.registerSound({
      id: NETHER_ARRIVAL_SPELL_SOUND_ID,
      uri: NETHER_ARRIVAL_SPELL_SOUND_URL,
      volume: SPELL_SOUND_VOLUME,
      loop: false,
    });
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.audio.stopSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.audio.unregisterSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    if (this.engine !== engine) {
      return;
    }

    this.engine = undefined;
    this.sequence = undefined;
    this.onComplete = undefined;
  }

  begin(onComplete?: () => void, onInventoryResetRequested?: () => void): void {
    if (!this.engine || this.sequence) {
      return;
    }

    this.onComplete = onComplete;
    this.smokeFrameCount = 0;
    this.smokeScale = 1;
    applyRoccoPlayerAppearance(this.engine, DEFAULT_ROCCO_PLAYER_APPEARANCE, this.localization);
    onInventoryResetRequested?.();
    this.engine.audio.playSound(NETHER_ARRIVAL_SPELL_SOUND_ID, {
      restart: true,
      volume: SPELL_SOUND_VOLUME,
    });
    this.sequence = { elapsedMs: 0 };
    void this.prepareSmoke();
  }

  update(deltaMs: number): void {
    if (!this.sequence || !this.engine || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    this.sequence.elapsedMs += deltaMs;
    if (this.smokeFrameCount === 0) {
      return;
    }

    const nextFrameIndex = Math.min(
      this.smokeFrameCount - 1,
      Math.floor(this.sequence.elapsedMs / NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS),
    );
    if (this.engine.video.sprites.getSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID)) {
      this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, nextFrameIndex);
    }
    if (this.sequence.elapsedMs < this.smokeFrameCount * NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS) {
      return;
    }

    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.sequence = undefined;
    const onComplete = this.onComplete;
    this.onComplete = undefined;
    onComplete?.();
  }
}
