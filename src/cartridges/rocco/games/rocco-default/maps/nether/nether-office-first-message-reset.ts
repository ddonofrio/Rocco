import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import {
  applyRoccoPlayerAppearance,
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_PLAYER_CONFIG,
} from '../../player';
import { createRoccoTwentyEurosInventoryItem, type RoccoInventoryItem } from '../../inventory';
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

const FIRST_MESSAGE_RESET_MESSAGE_ID = 'rocco-nether-office-first-reset';
const FIRST_MESSAGE_ALERT_MESSAGE_ID = 'rocco-nether-office-first-alert';
const SECOND_MESSAGE_ALERT_MESSAGE_ID = 'rocco-nether-office-second-alert';
const MESSAGE_TTL_MS = 5200;
const RESET_INPUT_LEASE_ID = 'nether-office-first-message-reset';
const SMOKE_TARGET_HEIGHT = 125;
const SPELL_SOUND_VOLUME = 0.42;

type FirstMessageResetPhase = 'reset-line' | 'smoke' | 'first-alert' | 'second-alert';

interface FirstMessageResetSequence {
  phase: FirstMessageResetPhase;
  elapsedMs: number;
}

export class NetherOfficeFirstMessageResetController {
  private readonly localization: RoccoLocalization;
  private readonly sayGuysprite: (line: string, id?: string) => void;
  private readonly onDefeat: (inventoryItems: readonly RoccoInventoryItem[]) => void;
  private engine: CartridgeSdkV1Runtime | undefined;
  private sequence: FirstMessageResetSequence | undefined;
  private inputLease: { dispose(): void } | undefined;
  private smokeFrameCount = 0;
  private smokeScale = 1;

  constructor(
    localization: RoccoLocalization,
    sayGuysprite: (line: string, id?: string) => void,
    onDefeat: (inventoryItems: readonly RoccoInventoryItem[]) => void,
  ) {
    this.localization = localization;
    this.sayGuysprite = sayGuysprite;
    this.onDefeat = onDefeat;
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
    this.inputLease?.dispose();
    this.inputLease = undefined;
    engine.audio.stopSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.audio.unregisterSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    if (this.engine !== engine) {
      return;
    }

    this.engine = undefined;
    this.sequence = undefined;
  }

  begin(): void {
    if (!this.engine || this.sequence) {
      return;
    }

    this.inputLease = this.engine.acquireInputLease(RESET_INPUT_LEASE_ID, 'interactive');
    this.sequence = { phase: 'reset-line', elapsedMs: 0 };
    this.sayGuysprite(
      this.localization.text.nether.officeReading.firstMessageResetLine,
      FIRST_MESSAGE_RESET_MESSAGE_ID,
    );
  }

  updateResetLine(sequence: FirstMessageResetSequence): void {
    if (
      !this.engine ||
      (sequence.elapsedMs < MESSAGE_TTL_MS && this.isMessageVisible(FIRST_MESSAGE_RESET_MESSAGE_ID))
    ) {
      return;
    }

    applyRoccoPlayerAppearance(this.engine, DEFAULT_ROCCO_PLAYER_APPEARANCE, this.localization);
    this.engine.audio.playSound(NETHER_ARRIVAL_SPELL_SOUND_ID, {
      restart: true,
      volume: SPELL_SOUND_VOLUME,
    });
    void this.prepareSmoke();
    this.sequence = { phase: 'smoke', elapsedMs: 0 };
  }

  update(deltaMs: number): void {
    const sequence = this.sequence;
    if (!sequence || !this.engine || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    sequence.elapsedMs += deltaMs;
    if (sequence.phase === 'reset-line') {
      this.updateResetLine(sequence);
      return;
    }

    if (sequence.phase === 'smoke') {
      this.updateSmoke(sequence);
      return;
    }

    if (sequence.phase === 'first-alert') {
      if (
        sequence.elapsedMs < MESSAGE_TTL_MS &&
        this.isMessageVisible(FIRST_MESSAGE_ALERT_MESSAGE_ID)
      ) {
        return;
      }

      this.sayGuysprite(
        this.localization.text.nether.officeReading.firstMessageAlertLines[1] ?? '',
        SECOND_MESSAGE_ALERT_MESSAGE_ID,
      );
      this.sequence = { phase: 'second-alert', elapsedMs: 0 };
      return;
    }

    if (
      sequence.elapsedMs < MESSAGE_TTL_MS &&
      this.isMessageVisible(SECOND_MESSAGE_ALERT_MESSAGE_ID)
    ) {
      return;
    }

    this.engine.video.messages.clearMessages();
    this.sequence = undefined;
    this.inputLease?.dispose();
    this.inputLease = undefined;
    this.onDefeat([
      {
        ...createRoccoTwentyEurosInventoryItem(this.localization),
        slotIndex: 0,
      },
    ]);
  }

  updateSmoke(sequence: FirstMessageResetSequence): void {
    if (!this.engine || this.smokeFrameCount === 0) {
      return;
    }

    const nextFrameIndex = Math.min(
      this.smokeFrameCount - 1,
      Math.floor(sequence.elapsedMs / NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS),
    );
    if (this.engine.video.sprites.getSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID)) {
      this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, nextFrameIndex);
    }
    if (sequence.elapsedMs < this.smokeFrameCount * NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS) {
      return;
    }

    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.sayGuysprite(
      this.localization.text.nether.officeReading.firstMessageAlertLines[0] ?? '',
      FIRST_MESSAGE_ALERT_MESSAGE_ID,
    );
    this.sequence = { phase: 'first-alert', elapsedMs: 0 };
  }

  async prepareSmoke(): Promise<void> {
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

  isMessageVisible(id: string): boolean {
    return this.engine?.video.messages.listMessages().some((message) => message.id === id) ?? false;
  }
}
