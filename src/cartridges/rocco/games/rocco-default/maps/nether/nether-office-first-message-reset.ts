import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { createRoccoTwentyEurosInventoryItem, type RoccoInventoryItem } from '../../inventory';
import type { RoccoLocalization } from '../../localization';
import { NetherOfficeRoccoResetEffect } from './nether-office-rocco-reset-effect';

const FIRST_MESSAGE_RESET_MESSAGE_ID = 'rocco-nether-office-first-reset';
const FIRST_MESSAGE_ALERT_MESSAGE_ID = 'rocco-nether-office-first-alert';
const SECOND_MESSAGE_ALERT_MESSAGE_ID = 'rocco-nether-office-second-alert';
const MESSAGE_TTL_MS = 5200;
const RESET_INPUT_LEASE_ID = 'nether-office-first-message-reset';

type FirstMessageResetPhase =
  | 'reset-line'
  | 'smoke'
  | 'first-alert'
  | 'second-alert'
  | 'rocco-reset';

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
  private readonly resetEffect: NetherOfficeRoccoResetEffect;

  constructor(
    localization: RoccoLocalization,
    sayGuysprite: (line: string, id?: string) => void,
    onDefeat: (inventoryItems: readonly RoccoInventoryItem[]) => void,
  ) {
    this.localization = localization;
    this.sayGuysprite = sayGuysprite;
    this.onDefeat = onDefeat;
    this.resetEffect = new NetherOfficeRoccoResetEffect(localization);
  }

  get isActive(): boolean {
    return this.sequence !== undefined;
  }

  mount(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.resetEffect.mount(engine);
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.inputLease?.dispose();
    this.inputLease = undefined;
    this.resetEffect.unmount(engine);
    if (this.engine !== engine) {
      return;
    }

    this.engine = undefined;
    this.sequence = undefined;
  }

  beginRoccoReset(onComplete: () => void, onInventoryResetRequested?: () => void): void {
    if (!this.engine || this.sequence) {
      return;
    }

    this.sequence = { phase: 'rocco-reset', elapsedMs: 0 };
    this.resetEffect.begin(onComplete, onInventoryResetRequested);
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

    this.resetEffect.begin();
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
      this.resetEffect.update(deltaMs);
      if (!this.resetEffect.isActive) {
        this.sayGuysprite(
          this.localization.text.nether.officeReading.firstMessageAlertLines[0] ?? '',
          FIRST_MESSAGE_ALERT_MESSAGE_ID,
        );
        this.sequence = { phase: 'first-alert', elapsedMs: 0 };
      }
      return;
    }

    if (sequence.phase === 'rocco-reset') {
      this.resetEffect.update(deltaMs);
      if (!this.resetEffect.isActive) {
        this.sequence = undefined;
      }
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

  isMessageVisible(id: string): boolean {
    return this.engine?.video.messages.listMessages().some((message) => message.id === id) ?? false;
  }
}
