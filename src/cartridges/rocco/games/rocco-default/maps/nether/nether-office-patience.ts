import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID } from './nether-console-hardware-spawn-level';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import type { RoccoLocalization } from '../../localization';
import type { RoccoLevelRestartRequest } from '../../../../levels/rocco-level-types';
import type { RoccoInventoryItem } from '../../inventory';
import { netherOfficeConfidenceSoundUrls } from './nether-assets';
import { netherYouLoseSoundUrl } from './nether-security-camera-assets';
import { NetherOfficeFirstMessageResetController } from './nether-office-first-message-reset';
import {
  beginNetherOfficeDefeatFade,
  isNetherOfficeDefeatFadeComplete,
  showNetherOfficeDefeatTitle,
} from './nether-office-defeat';
import {
  NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS,
  NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID,
  NETHER_RESET_OFFICE_DEFEAT_TITLE_DURATION_MS,
  NETHER_RESET_OFFICE_DEFEAT_TITLE_ID,
} from './nether-reset-office-scene';
import {
  removeNetherOfficePatienceHud,
  renderNetherOfficePatienceHud,
} from './nether-office-patience-hud';

export type NetherOfficeRoom = 'first' | 'second';
export type NetherOfficePatienceTerminalState = 'security' | 'complete' | undefined;

const NETHER_OFFICE_PATIENCE_INITIAL_VALUE = 50;
const NETHER_OFFICE_PATIENCE_MAX_VALUE = 100;
const NETHER_OFFICE_PATIENCE_MIN_VALUE = 0;
const NETHER_OFFICE_PATIENCE_CORRECT_RESPONSE_REWARD = 15;
const NETHER_OFFICE_PATIENCE_DECAY_INTERVAL_MS = 3000;
const NETHER_OFFICE_PATIENCE_OTHER_ROOM_DECAY_INTERVAL_MS = 1000;
const NETHER_OFFICE_PATIENCE_MESSAGE_TTL_MS = 5200;
const NETHER_OFFICE_PATIENCE_RESET_MESSAGE_INDEXES = new Set([2, 4]);
const NETHER_OFFICE_PATIENCE_SECURITY_LINE_INDEX = 0;
const NETHER_OFFICE_PATIENCE_START_MESSAGE_ID = 'rocco-nether-office-first-message-prompt';
const NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID = 'rocco-nether-office-response';
const NETHER_OFFICE_PATIENCE_NEXT_MESSAGE_ID = 'rocco-nether-office-next-message';
const NETHER_OFFICE_PATIENCE_SECURITY_MESSAGE_ID = 'rocco-nether-office-security-message';
const NETHER_OFFICE_SECOND_MESSAGE_SECURITY_MESSAGE_ID =
  'rocco-nether-office-second-message-security';
const NETHER_OFFICE_SECOND_MESSAGE_SECURITY_FOLLOW_UP_MESSAGE_ID =
  'rocco-nether-office-second-message-security-follow-up';
const NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID = 'rocco-nether-office-confidence-gain';
const NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID = 'rocco-nether-office-confidence-loss';
const NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID = 'rocco-nether-office-patience-defeat-sound';
const NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_VOLUME = 0.25;
const NETHER_OFFICE_CONFIDENCE_GAIN_ANIMATION_MS = 500;
const NETHER_OFFICE_CONFIDENCE_LOSS_ANIMATION_MS = 250;

interface ConfidenceAnimation {
  from: number;
  to: number;
  elapsedMs: number;
  durationMs: number;
  shouldConfirm: boolean;
  isRepeated: boolean;
  isFirstMessageReset: boolean;
  isSecondMessageSecurity: boolean;
  isConsoleReset: boolean;
}

interface PatienceDefeatSequence {
  phase: 'security-line' | 'security-follow-up' | 'fading' | 'title';
  elapsedMs: number;
  inventoryItems?: readonly RoccoInventoryItem[];
  followUpSecurityLine?: string;
}

function resolveRandomUnit(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4_294_967_296;
}

export class NetherOfficePatienceController {
  private readonly localization: RoccoLocalization;
  private engine: CartridgeSdkV1Runtime | undefined;
  private room: NetherOfficeRoom | undefined;
  private onComplete: (() => void) | undefined;
  private onDefeat: ((request?: RoccoLevelRestartRequest) => void) | undefined;
  private onConsoleResetRequested: (() => void) | undefined;
  private patience = NETHER_OFFICE_PATIENCE_INITIAL_VALUE;
  private decayElapsedMs = 0;
  private started = false;
  private terminalState: NetherOfficePatienceTerminalState;
  private readonly readMessageIndexes = new Set<number>();
  private confidenceAnimation: ConfidenceAnimation | undefined;
  private wrongReplyFollowUpElapsedMs: number | undefined;
  private defeatSequence: PatienceDefeatSequence | undefined;
  private pendingConsoleReset = false;
  private readonly firstMessageReset: NetherOfficeFirstMessageResetController;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.firstMessageReset = new NetherOfficeFirstMessageResetController(
      localization,
      (line, id) => this.sayGuysprite(line, id),
      (inventoryItems) => this.beginDefeatFade(inventoryItems),
    );
  }

  private finishNonSpecialConfidenceAnimation(animation: ConfidenceAnimation): void {
    if (animation.isRepeated) {
      this.checkThreshold();
      if (this.terminalState) {
        return;
      }

      this.sayGuysprite(
        this.localization.text.nether.officeReading.repeatedLine,
        NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID,
      );
      this.wrongReplyFollowUpElapsedMs = 0;
      return;
    }

    if (animation.shouldConfirm) {
      this.sayGuysprite(
        this.localization.text.nether.officeReading.correctLine,
        NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID,
      );
    }
    this.checkThreshold();
    if (!animation.shouldConfirm && !this.terminalState) {
      const lines = this.localization.text.nether.officeReading.incorrectLines;
      const line = lines[Math.min(resolvePatienceZeroLineIndex(), lines.length - 1)];
      if (line) {
        this.sayGuysprite(line, NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID);
        this.wrongReplyFollowUpElapsedMs = 0;
      }
    }
  }

  private showConsoleResetConfirmation(): void {
    this.sayGuysprite(
      this.localization.text.nether.officeReading.resetCorrectLine,
      NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID,
    );
    this.pendingConsoleReset = true;
  }

  get patiencePercent(): number {
    return this.patience;
  }

  get isStarted(): boolean {
    return this.started;
  }

  get isComplete(): boolean {
    return this.terminalState === 'complete';
  }

  mount(
    engine: CartridgeSdkV1Runtime,
    room: NetherOfficeRoom,
    onComplete: () => void,
    onDefeat?: (request?: RoccoLevelRestartRequest) => void,
    onConsoleResetRequested?: () => void,
  ): void {
    this.engine = engine;
    this.room = room;
    this.onComplete = onComplete;
    this.onDefeat = onDefeat;
    this.onConsoleResetRequested = onConsoleResetRequested;
    this.firstMessageReset.mount(engine);
    this.registerConfidenceSounds(engine);
    if (this.started) {
      this.renderHud();
    }
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.removeHud(engine);
    this.unregisterConfidenceSounds(engine);
    if (this.engine !== engine) {
      return;
    }

    this.engine = undefined;
    this.room = undefined;
    this.onComplete = undefined;
    this.onDefeat = undefined;
    this.onConsoleResetRequested = undefined;
    this.wrongReplyFollowUpElapsedMs = undefined;
    this.defeatSequence = undefined;
    this.pendingConsoleReset = false;
    this.firstMessageReset.unmount(engine);
    engine.video.titles.removeTitle(NETHER_RESET_OFFICE_DEFEAT_TITLE_ID);
    engine.video.primitives.removePrimitive(NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID);
  }

  beginAtSitting(): void {
    if (this.started || !this.engine) {
      return;
    }

    this.started = true;
    this.patience = NETHER_OFFICE_PATIENCE_INITIAL_VALUE;
    this.decayElapsedMs = 0;
    this.renderHud();
    this.sayGuysprite(
      this.localization.text.nether.officeReading.startLine,
      NETHER_OFFICE_PATIENCE_START_MESSAGE_ID,
    );
  }

  resetForArrival(): void {
    this.patience = NETHER_OFFICE_PATIENCE_INITIAL_VALUE;
    this.decayElapsedMs = 0;
    this.started = false;
    this.terminalState = undefined;
    this.readMessageIndexes.clear();
    this.confidenceAnimation = undefined;
    this.wrongReplyFollowUpElapsedMs = undefined;
    this.defeatSequence = undefined;
    this.pendingConsoleReset = false;
  }

  checkThreshold(): void {
    if (this.patience <= NETHER_OFFICE_PATIENCE_MIN_VALUE) {
      this.patience = NETHER_OFFICE_PATIENCE_MIN_VALUE;
      this.terminalState = 'security';
      this.renderHud();
      const lines = this.localization.text.nether.officeReading.zeroLines;
      const line = lines[Math.min(resolvePatienceZeroLineIndex(), lines.length - 1)];
      if (line) {
        this.sayGuysprite(line, NETHER_OFFICE_PATIENCE_SECURITY_MESSAGE_ID);
      }
      this.defeatSequence = { phase: 'security-line', elapsedMs: 0 };
      return;
    }

    if (this.patience >= NETHER_OFFICE_PATIENCE_MAX_VALUE) {
      this.patience = NETHER_OFFICE_PATIENCE_MAX_VALUE;
      this.terminalState = 'complete';
      this.renderHud();
      this.onComplete?.();
    }
  }

  update(deltaMs: number): void {
    if (!this.started || !this.engine || !this.room || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.confidenceAnimation) {
      this.updateConfidenceAnimation(deltaMs);
      return;
    }

    if (this.firstMessageReset.isActive) {
      this.firstMessageReset.update(deltaMs);
      return;
    }

    if (this.defeatSequence) {
      this.updateDefeatSequence(deltaMs);
      return;
    }

    if (this.pendingConsoleReset) {
      if (!this.hasGuyspriteMessage(NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID)) {
        this.pendingConsoleReset = false;
        this.onConsoleResetRequested?.();
      }
      return;
    }

    if (this.terminalState) {
      return;
    }

    if (this.wrongReplyFollowUpElapsedMs !== undefined) {
      this.wrongReplyFollowUpElapsedMs += deltaMs;
      if (
        this.wrongReplyFollowUpElapsedMs >= NETHER_OFFICE_PATIENCE_MESSAGE_TTL_MS ||
        !this.hasGuyspriteMessage(NETHER_OFFICE_PATIENCE_RESPONSE_MESSAGE_ID)
      ) {
        this.wrongReplyFollowUpElapsedMs = undefined;
        this.sayGuysprite(
          this.localization.text.nether.officeReading.nextLine,
          NETHER_OFFICE_PATIENCE_NEXT_MESSAGE_ID,
        );
      }
    }

    this.decayElapsedMs += deltaMs;
    const intervalMs =
      this.room === 'first'
        ? NETHER_OFFICE_PATIENCE_OTHER_ROOM_DECAY_INTERVAL_MS
        : NETHER_OFFICE_PATIENCE_DECAY_INTERVAL_MS;
    while (this.decayElapsedMs >= intervalMs && this.patience > 0) {
      this.decayElapsedMs -= intervalMs;
      this.patience -= 1;
    }

    this.patience = Math.max(NETHER_OFFICE_PATIENCE_MIN_VALUE, this.patience);
    this.renderHud();
    this.checkThreshold();
  }

  handleMessageReply(messageIndex: number, isCorrect: boolean): void {
    if (!this.started || this.terminalState) {
      return;
    }

    const isRepeated = this.readMessageIndexes.has(messageIndex);
    this.readMessageIndexes.add(messageIndex);
    const currentPatience = this.patience;
    let nextPatience =
      this.patience + (isCorrect ? NETHER_OFFICE_PATIENCE_CORRECT_RESPONSE_REWARD : -15);
    nextPatience = isRepeated ? Math.floor(this.patience / 2) : nextPatience;
    nextPatience = Math.min(
      NETHER_OFFICE_PATIENCE_MAX_VALUE,
      Math.max(NETHER_OFFICE_PATIENCE_MIN_VALUE, nextPatience),
    );
    const isGain = nextPatience > currentPatience;
    const isFirstMessageReset = messageIndex === 0 && isCorrect && !isRepeated;
    const isSecondMessageSecurity = messageIndex === 1 && isCorrect && !isRepeated;
    const isConsoleReset =
      NETHER_OFFICE_PATIENCE_RESET_MESSAGE_INDEXES.has(messageIndex) && isCorrect && !isRepeated;
    this.engine?.audio.playSound(
      isGain ? NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID : NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID,
      { restart: true },
    );
    this.confidenceAnimation = {
      from: currentPatience,
      to: nextPatience,
      elapsedMs: 0,
      durationMs: isGain
        ? NETHER_OFFICE_CONFIDENCE_GAIN_ANIMATION_MS
        : NETHER_OFFICE_CONFIDENCE_LOSS_ANIMATION_MS,
      shouldConfirm: isCorrect,
      isRepeated,
      isFirstMessageReset,
      isSecondMessageSecurity,
      isConsoleReset,
    };
  }

  updateConfidenceAnimation(deltaMs: number): void {
    const animation = this.confidenceAnimation;
    if (!animation) {
      return;
    }

    animation.elapsedMs += deltaMs;
    const progress = Math.min(1, animation.elapsedMs / animation.durationMs);
    this.patience = Math.round(animation.from + (animation.to - animation.from) * progress);
    this.renderHud();
    if (progress < 1) {
      return;
    }

    this.confidenceAnimation = undefined;
    if (animation.isFirstMessageReset) {
      this.terminalState = 'security';
      this.firstMessageReset.begin();
      return;
    }

    if (animation.isSecondMessageSecurity) {
      this.terminalState = 'security';
      this.sayGuysprite(
        this.localization.text.nether.officeReading.secondMessageSecurityLine,
        NETHER_OFFICE_SECOND_MESSAGE_SECURITY_MESSAGE_ID,
      );
      this.defeatSequence = {
        phase: 'security-line',
        elapsedMs: 0,
        followUpSecurityLine: this.localization.text.nether.officeReading.firstMessageAlertLines[1],
      };
      return;
    }

    if (animation.isConsoleReset) {
      this.showConsoleResetConfirmation();
      return;
    }

    this.finishNonSpecialConfidenceAnimation(animation);
  }

  beginDefeatFade(inventoryItems?: readonly RoccoInventoryItem[]): void {
    if (!this.engine) {
      return;
    }

    this.engine.audio.playSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID, {
      restart: true,
      volume: NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_VOLUME,
    });
    beginNetherOfficeDefeatFade(this.engine);
    this.defeatSequence = { phase: 'fading', elapsedMs: 0, inventoryItems };
  }

  updateDefeatSequence(deltaMs: number): void {
    const sequence = this.defeatSequence;
    if (!sequence || !this.engine) {
      return;
    }

    sequence.elapsedMs += deltaMs;
    if (sequence.phase === 'security-line' || sequence.phase === 'security-follow-up') {
      this.updateSecurityDefeatSequence(sequence);
      return;
    }

    if (sequence.phase === 'fading') {
      if (
        !isNetherOfficeDefeatFadeComplete(
          this.engine,
          Math.min(sequence.elapsedMs, NETHER_RESET_OFFICE_DEFEAT_FADE_DURATION_MS),
        )
      ) {
        return;
      }

      showNetherOfficeDefeatTitle(this.engine, this.localization);
      this.defeatSequence = { phase: 'title', elapsedMs: 0 };
      return;
    }

    if (sequence.elapsedMs < NETHER_RESET_OFFICE_DEFEAT_TITLE_DURATION_MS) {
      return;
    }

    this.engine.video.titles.removeTitle(NETHER_RESET_OFFICE_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(NETHER_RESET_OFFICE_DEFEAT_FADE_PRIMITIVE_ID);
    this.engine.audio.stopSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID);
    this.defeatSequence = undefined;
    const restartRequest: RoccoLevelRestartRequest = {
      levelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      entryConnectorId: 'entry',
      forceArrivalSequence: true,
    };
    if (sequence.inventoryItems) {
      restartRequest.inventoryItems = sequence.inventoryItems;
    }
    this.onDefeat?.(restartRequest);
  }

  updateSecurityDefeatSequence(sequence: PatienceDefeatSequence): void {
    let messageId = NETHER_OFFICE_SECOND_MESSAGE_SECURITY_FOLLOW_UP_MESSAGE_ID;
    if (sequence.phase === 'security-line') {
      messageId = sequence.followUpSecurityLine
        ? NETHER_OFFICE_SECOND_MESSAGE_SECURITY_MESSAGE_ID
        : NETHER_OFFICE_PATIENCE_SECURITY_MESSAGE_ID;
    }
    if (
      sequence.elapsedMs < NETHER_OFFICE_PATIENCE_MESSAGE_TTL_MS &&
      this.hasGuyspriteMessage(messageId)
    ) {
      return;
    }
    if (sequence.phase === 'security-line' && sequence.followUpSecurityLine) {
      this.sayGuysprite(
        sequence.followUpSecurityLine,
        NETHER_OFFICE_SECOND_MESSAGE_SECURITY_FOLLOW_UP_MESSAGE_ID,
      );
      this.defeatSequence = { phase: 'security-follow-up', elapsedMs: 0 };
      return;
    }
    this.engine?.video.messages.clearMessages();
    this.beginDefeatFade();
  }

  renderHud(): void {
    if (!this.engine || !this.started) {
      return;
    }
    renderNetherOfficePatienceHud(this.engine, this.localization, this.patience);
  }

  removeHud(engine: CartridgeSdkV1Runtime): void {
    removeNetherOfficePatienceHud(engine);
  }

  registerConfidenceSounds(engine: CartridgeSdkV1Runtime): void {
    engine.audio.registerSound({
      id: NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID,
      uri: netherOfficeConfidenceSoundUrls.gain,
      volume: 0.45,
      loop: false,
    });
    engine.audio.registerSound({
      id: NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID,
      uri: netherOfficeConfidenceSoundUrls.lose,
      volume: 0.45,
      loop: false,
    });
    engine.audio.registerSound({
      id: NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID,
      uri: netherYouLoseSoundUrl,
      volume: NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_VOLUME,
      loop: false,
    });
  }

  unregisterConfidenceSounds(engine: CartridgeSdkV1Runtime): void {
    engine.audio.stopSound(NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID);
    engine.audio.stopSound(NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID);
    engine.audio.stopSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID);
    engine.audio.unregisterSound(NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID);
    engine.audio.unregisterSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID);
  }

  sayGuysprite(line: string, id?: string): void {
    const messages = this.engine?.video.messages.listMessages() ?? [];
    for (const message of messages) {
      if (message.spriteInstanceId === GUYSPRITE_CONFIG.ids.instance) {
        this.engine?.video.messages.removeMessage(message.id);
      }
    }
    this.engine?.video.messages.say(GUYSPRITE_CONFIG.ids.instance, line, {
      id,
      ttlMs: NETHER_OFFICE_PATIENCE_MESSAGE_TTL_MS,
      style: {
        fill: '#4a1f12',
        bubbleFill: '#f3dfc7',
        bubbleStroke: '#8a4e32',
        bubbleStrokeWidth: 2,
      },
    });
  }

  hasGuyspriteMessage(id: string): boolean {
    return this.engine?.video.messages.listMessages().some((message) => message.id === id) ?? false;
  }
}

function resolvePatienceZeroLineIndex(): number {
  return resolveRandomUnit() < 0.5
    ? NETHER_OFFICE_PATIENCE_SECURITY_LINE_INDEX
    : NETHER_OFFICE_PATIENCE_SECURITY_LINE_INDEX + 1;
}
