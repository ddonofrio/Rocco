import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoGridMenuActivation } from '../../../../console/video/grid-menu';
import type {
  RoccoSpriteMessageOptions,
  RoccoSpriteMessageStyle,
} from '../../../../console/video/messages';
import { createRoccoDialogueChoiceMenu, resolveRoccoDialogueChoice } from './choice-menu';
import type { RoccoDialogueChoiceNode, RoccoDialogueLine } from './types';

const DEFAULT_DIALOGUE_PLAYER_TTL_MS = 4800;
const DEFAULT_DIALOGUE_NPC_TTL_MS = 5600;
const DEFAULT_DIALOGUE_PROMPT_TTL_MS = 5200;

type RoccoDialoguePhase =
  | 'idle'
  | 'awaiting-choice'
  | 'waiting-player'
  | 'waiting-bridge'
  | 'waiting-npc';

interface RoccoDialoguePendingStep {
  remainingMs: number;
  messageSpriteInstanceId?: string;
  messageId?: string;
  onComplete: () => void;
}

type RoccoDialogueMessageKind = 'say' | 'think';

interface RoccoDialogueLinearSequence {
  speaker: 'player' | 'npc';
  lines: readonly RoccoDialogueLine[];
  lineIndex: number;
  messageKind: RoccoDialogueMessageKind;
  ttlMs: number;
  messageOptions?: Omit<RoccoSpriteMessageOptions, 'ttlMs'>;
  onComplete?: () => void;
}

export interface RoccoDialogueSessionHooks {
  beforeNpcReply?: (choice: RoccoDialogueChoiceNode) => number | void;
  afterNpcLine?: (choice: RoccoDialogueChoiceNode) => void;
}

export interface RoccoDialogueSessionOptions {
  id: string;
  engine: CartridgeSdkV1Runtime;
  playerSpriteInstanceId: string;
  npcSpriteInstanceId: string;
  menuY?: number;
  playerLineTtlMs?: number;
  npcLineTtlMs?: number;
  promptTtlMs?: number;
  npcMessageStyle?: Partial<RoccoSpriteMessageStyle>;
  hooks?: RoccoDialogueSessionHooks;
}

export interface RoccoDialogueConversationStart {
  npcLine?: RoccoDialogueLine;
  choices: readonly RoccoDialogueChoiceNode[];
}

export interface RoccoDialogueLinearSequenceStart {
  speaker: 'player' | 'npc';
  lines: readonly RoccoDialogueLine[];
  lineTtlMs?: number;
  messageKind?: RoccoDialogueMessageKind;
  messageOptions?: Omit<RoccoSpriteMessageOptions, 'ttlMs'>;
  onComplete?: () => void;
}

export class RoccoDialogueSession {
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly id: string;
  private readonly playerSpriteInstanceId: string;
  private readonly npcSpriteInstanceId: string;
  private readonly menuY?: number;
  private readonly playerLineTtlMs: number;
  private readonly npcLineTtlMs: number;
  private readonly promptTtlMs: number;
  private readonly npcMessageStyle?: Partial<RoccoSpriteMessageStyle>;
  private readonly hooks?: RoccoDialogueSessionHooks;
  private readonly inputLeaseOwnerId: string;
  private phase: RoccoDialoguePhase = 'idle';
  private currentChoices: readonly RoccoDialogueChoiceNode[] = [];
  private pendingStep: RoccoDialoguePendingStep | undefined;
  private linearSequence: RoccoDialogueLinearSequence | undefined;
  private advanceOnlyLease: ReturnType<CartridgeSdkV1Runtime['acquireInputLease']> | undefined =
    undefined;

  constructor(options: RoccoDialogueSessionOptions) {
    this.id = options.id;
    this.engine = options.engine;
    this.playerSpriteInstanceId = options.playerSpriteInstanceId;
    this.npcSpriteInstanceId = options.npcSpriteInstanceId;
    this.menuY = options.menuY;
    this.playerLineTtlMs = Math.max(1, options.playerLineTtlMs ?? DEFAULT_DIALOGUE_PLAYER_TTL_MS);
    this.npcLineTtlMs = Math.max(1, options.npcLineTtlMs ?? DEFAULT_DIALOGUE_NPC_TTL_MS);
    this.promptTtlMs = Math.max(1, options.promptTtlMs ?? DEFAULT_DIALOGUE_PROMPT_TTL_MS);
    this.npcMessageStyle = options.npcMessageStyle;
    this.hooks = options.hooks;
    this.inputLeaseOwnerId = `dialogue:${options.id}`;
  }

  private startChoice(choice: RoccoDialogueChoiceNode): void {
    this.setPhase('waiting-player');
    const playerLineDurationMs = this.resolveLineDuration(choice.playerLine, this.playerLineTtlMs);
    const preReplyDurationMs = Math.max(0, this.hooks?.beforeNpcReply?.(choice) ?? 0);
    this.engine.video.messages.say(
      this.playerSpriteInstanceId,
      this.resolveMessageText(choice.playerLine),
      {
        ttlMs: this.playerLineTtlMs,
        background: true,
      },
    );
    this.schedule(
      playerLineDurationMs,
      () => {
        const bridgeDelayMs = Math.max(0, preReplyDurationMs - playerLineDurationMs);
        if (bridgeDelayMs > 0) {
          this.setPhase('waiting-bridge');
          this.schedule(bridgeDelayMs, () => this.showNpcLine(choice));
          return;
        }

        this.showNpcLine(choice);
      },
      this.playerSpriteInstanceId,
    );
  }

  private showNpcLine(choice: RoccoDialogueChoiceNode): void {
    this.setPhase('waiting-npc');
    this.engine.video.messages.say(
      this.npcSpriteInstanceId,
      this.resolveMessageText(choice.npcLine),
      {
        ...this.createNpcMessageOptions(this.npcLineTtlMs),
        background: true,
      },
    );
    this.schedule(
      this.resolveLineDuration(choice.npcLine, this.npcLineTtlMs),
      () => {
        this.hooks?.afterNpcLine?.(choice);
        if (choice.choices && choice.choices.length > 0) {
          this.openChoices(choice.choices);
          return;
        }

        this.finishConversation();
      },
      this.npcSpriteInstanceId,
    );
  }

  private openChoices(choices: readonly RoccoDialogueChoiceNode[]): void {
    this.currentChoices = choices;
    this.setPhase('awaiting-choice');
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: this.id,
        y: this.menuY,
        choices: choices.map((choice) => ({
          id: choice.id,
          text: this.resolveMenuLabel(choice.playerLine),
        })),
      }).gridMenu,
    );
  }

  private finishConversation(): void {
    this.pendingStep = undefined;
    this.currentChoices = [];
    this.setPhase('idle');
  }

  private finishLinearSequence(): void {
    const onComplete = this.linearSequence?.onComplete;
    this.pendingStep = undefined;
    this.currentChoices = [];
    this.linearSequence = undefined;
    this.setPhase('idle');
    onComplete?.();
  }

  private schedule(
    delayMs: number,
    onComplete: () => void,
    messageSpriteInstanceId?: string,
    messageId?: string,
  ): void {
    this.pendingStep = {
      remainingMs: Math.max(0, delayMs),
      messageSpriteInstanceId,
      messageId,
      onComplete,
    };
  }

  private clearPendingStepMessage(): void {
    const messageId = this.pendingStep?.messageId;
    if (messageId) {
      this.engine.video.messages.removeMessage(messageId);
      return;
    }

    const spriteInstanceId = this.pendingStep?.messageSpriteInstanceId;
    if (!spriteInstanceId) {
      return;
    }

    this.engine.video.messages.removeMessage(`${spriteInstanceId}:active-message`);
  }

  private completePendingStep(): void {
    if (!this.pendingStep) {
      return;
    }

    const onComplete = this.pendingStep.onComplete;
    this.pendingStep = undefined;
    onComplete();
  }

  private showCurrentLinearSequenceLine(): void {
    const sequence = this.linearSequence;
    if (!sequence) {
      return;
    }

    const line = sequence.lines[sequence.lineIndex];
    if (!line) {
      this.finishLinearSequence();
      return;
    }

    const spriteInstanceId =
      sequence.speaker === 'player' ? this.playerSpriteInstanceId : this.npcSpriteInstanceId;
    const messageOptions: RoccoSpriteMessageOptions = {
      ttlMs: sequence.ttlMs,
      ...sequence.messageOptions,
    };

    this.setPhase(sequence.speaker === 'player' ? 'waiting-player' : 'waiting-npc');
    if (sequence.messageKind === 'think') {
      this.engine.video.messages.think(
        spriteInstanceId,
        this.resolveMessageText(line),
        messageOptions,
      );
    } else {
      this.engine.video.messages.say(
        spriteInstanceId,
        this.resolveMessageText(line),
        messageOptions,
      );
    }
    this.schedule(
      this.resolveLineDuration(line, sequence.ttlMs),
      () => this.advanceLinearSequence(),
      spriteInstanceId,
      sequence.messageOptions?.id,
    );
  }

  private advanceLinearSequence(): void {
    if (!this.linearSequence) {
      return;
    }

    if (this.linearSequence.lineIndex < this.linearSequence.lines.length - 1) {
      this.linearSequence = {
        ...this.linearSequence,
        lineIndex: this.linearSequence.lineIndex + 1,
      };
      this.showCurrentLinearSequenceLine();
      return;
    }

    this.finishLinearSequence();
  }

  private resolveLineDuration(line: RoccoDialogueLine, ttlMs: number): number {
    return (typeof line === 'string' ? 1 : Math.max(1, line.length)) * ttlMs;
  }

  private resolveMessageText(line: RoccoDialogueLine): string[] {
    if (typeof line === 'string') {
      return [line];
    }

    return [...line];
  }

  private createNpcMessageOptions(ttlMs: number): RoccoSpriteMessageOptions {
    return {
      ttlMs,
      ...(this.npcMessageStyle && { style: this.npcMessageStyle }),
    };
  }

  private resolveMenuLabel(line: RoccoDialogueLine): string {
    if (typeof line === 'string') {
      return line;
    }

    return line.join(' ');
  }

  private setPhase(phase: RoccoDialoguePhase): void {
    this.phase = phase;
    if (['waiting-player', 'waiting-bridge', 'waiting-npc'].includes(phase)) {
      this.acquireAdvanceOnlyLease();
      return;
    }

    this.releaseAdvanceOnlyLease();
  }

  private acquireAdvanceOnlyLease(): void {
    this.advanceOnlyLease ??= this.engine.acquireInputLease(this.inputLeaseOwnerId, 'advance-only');
  }

  private releaseAdvanceOnlyLease(): void {
    this.advanceOnlyLease?.dispose();
    this.advanceOnlyLease = undefined;
  }

  beginConversation(start: RoccoDialogueConversationStart): void {
    this.cancel();
    this.currentChoices = start.choices;
    if (start.npcLine === undefined) {
      this.openChoices(this.currentChoices);
      return;
    }

    this.setPhase('waiting-npc');
    this.engine.video.messages.say(
      this.npcSpriteInstanceId,
      this.resolveMessageText(start.npcLine),
      {
        ...this.createNpcMessageOptions(this.promptTtlMs),
        background: true,
      },
    );
    this.schedule(
      this.resolveLineDuration(start.npcLine, this.promptTtlMs),
      () => {
        this.openChoices(this.currentChoices);
      },
      this.npcSpriteInstanceId,
    );
  }

  handleGridMenu(activation: RoccoGridMenuActivation): boolean {
    if (this.phase !== 'awaiting-choice') {
      return false;
    }

    const menu = createRoccoDialogueChoiceMenu({
      id: this.id,
      y: this.menuY,
      choices: this.currentChoices.map((choice) => ({
        id: choice.id,
        text: this.resolveMenuLabel(choice.playerLine),
      })),
    });
    const selected = resolveRoccoDialogueChoice(menu, activation);
    if (!selected) {
      return false;
    }

    const choice = this.currentChoices.find((candidate) => candidate.id === selected.id);
    if (!choice) {
      return false;
    }

    this.startChoice(choice);
    return true;
  }

  beginLinearSequence(start: RoccoDialogueLinearSequenceStart): void {
    this.cancel();
    if (start.lines.length === 0) {
      start.onComplete?.();
      return;
    }

    this.linearSequence = {
      speaker: start.speaker,
      lines: [...start.lines],
      lineIndex: 0,
      messageKind: start.messageKind ?? 'say',
      ttlMs: Math.max(
        1,
        start.lineTtlMs ?? (start.speaker === 'player' ? this.playerLineTtlMs : this.npcLineTtlMs),
      ),
      messageOptions: start.messageOptions,
      onComplete: start.onComplete,
    };
    this.showCurrentLinearSequenceLine();
  }

  update(deltaMs: number): void {
    if (!this.pendingStep || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    let remainingDeltaMs = deltaMs;
    while (this.pendingStep && remainingDeltaMs > 0) {
      if (this.pendingStep.remainingMs > remainingDeltaMs) {
        this.pendingStep.remainingMs -= remainingDeltaMs;
        return;
      }

      remainingDeltaMs -= this.pendingStep.remainingMs;
      this.completePendingStep();
    }
  }

  advance(): boolean {
    if (!this.pendingStep || this.phase === 'idle' || this.phase === 'awaiting-choice') {
      return false;
    }

    this.clearPendingStepMessage();
    this.pendingStep.remainingMs = 0;
    this.completePendingStep();
    return true;
  }

  cancel(): void {
    this.pendingStep = undefined;
    this.currentChoices = [];
    this.linearSequence = undefined;
    this.setPhase('idle');
    if (this.engine.video.gridMenus.isOpen(this.id)) {
      this.engine.video.gridMenus.closeMenu();
    }
  }

  isActive(): boolean {
    return this.phase !== 'idle';
  }

  isAwaitingChoice(): boolean {
    return this.phase === 'awaiting-choice';
  }

  reopenChoices(): boolean {
    if (this.phase !== 'awaiting-choice' || this.currentChoices.length === 0) {
      return false;
    }

    if (this.engine.video.gridMenus.isOpen(this.id)) {
      return true;
    }

    this.openChoices(this.currentChoices);
    return true;
  }
}
