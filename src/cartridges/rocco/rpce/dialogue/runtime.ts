import type { RoccoEngine } from '../../../../console/engine-sdk';
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
  onComplete: () => void;
}

export interface RoccoDialogueSessionHooks {
  beforeNpcReply?: (choice: RoccoDialogueChoiceNode) => number | void;
  afterNpcLine?: (choice: RoccoDialogueChoiceNode) => void;
}

export interface RoccoDialogueSessionOptions {
  id: string;
  engine: RoccoEngine;
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

export class RoccoDialogueSession {
  private readonly engine: RoccoEngine;
  private readonly id: string;
  private readonly playerSpriteInstanceId: string;
  private readonly npcSpriteInstanceId: string;
  private readonly menuY?: number;
  private readonly playerLineTtlMs: number;
  private readonly npcLineTtlMs: number;
  private readonly promptTtlMs: number;
  private readonly npcMessageStyle?: Partial<RoccoSpriteMessageStyle>;
  private readonly hooks?: RoccoDialogueSessionHooks;
  private phase: RoccoDialoguePhase = 'idle';
  private currentChoices: readonly RoccoDialogueChoiceNode[] = [];
  private pendingStep: RoccoDialoguePendingStep | undefined;

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
  }

  beginConversation(start: RoccoDialogueConversationStart): void {
    this.cancel();
    this.currentChoices = start.choices;
    if (start.npcLine === undefined) {
      this.openChoices(this.currentChoices);
      return;
    }

    this.engine.setInputEnabled(false);
    this.phase = 'waiting-npc';
    this.engine.video.messages.say(
      this.npcSpriteInstanceId,
      this.resolveMessageText(start.npcLine),
      this.createNpcMessageOptions(this.promptTtlMs),
    );
    this.schedule(
      this.resolveLineDuration(start.npcLine, this.promptTtlMs),
      () => {
        this.openChoices(this.currentChoices);
      },
      this.npcSpriteInstanceId,
    );
    this.engine.video.render(0);
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
    this.completePendingStep();
    return true;
  }

  cancel(): void {
    this.pendingStep = undefined;
    this.currentChoices = [];
    this.phase = 'idle';
    if (this.engine.video.gridMenus.isOpen(this.id)) {
      this.engine.video.gridMenus.closeMenu();
    }
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
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

  private startChoice(choice: RoccoDialogueChoiceNode): void {
    this.phase = 'waiting-player';
    this.engine.setInputEnabled(false);
    const playerLineDurationMs = this.resolveLineDuration(choice.playerLine, this.playerLineTtlMs);
    const preReplyDurationMs = Math.max(0, this.hooks?.beforeNpcReply?.(choice) ?? 0);
    this.engine.video.messages.say(
      this.playerSpriteInstanceId,
      this.resolveMessageText(choice.playerLine),
      {
        ttlMs: this.playerLineTtlMs,
      },
    );
    this.schedule(
      playerLineDurationMs,
      () => {
        const bridgeDelayMs = Math.max(0, preReplyDurationMs - playerLineDurationMs);
        if (bridgeDelayMs > 0) {
          this.phase = 'waiting-bridge';
          this.schedule(bridgeDelayMs, () => this.showNpcLine(choice));
          return;
        }

        this.showNpcLine(choice);
      },
      this.playerSpriteInstanceId,
    );
    this.engine.video.render(0);
  }

  private showNpcLine(choice: RoccoDialogueChoiceNode): void {
    this.phase = 'waiting-npc';
    this.engine.video.messages.say(
      this.npcSpriteInstanceId,
      this.resolveMessageText(choice.npcLine),
      this.createNpcMessageOptions(this.npcLineTtlMs),
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
    this.engine.video.render(0);
  }

  private openChoices(choices: readonly RoccoDialogueChoiceNode[]): void {
    this.currentChoices = choices;
    this.phase = 'awaiting-choice';
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
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
  }

  private finishConversation(): void {
    this.pendingStep = undefined;
    this.currentChoices = [];
    this.phase = 'idle';
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
  }

  private schedule(
    delayMs: number,
    onComplete: () => void,
    messageSpriteInstanceId?: string,
  ): void {
    this.pendingStep = {
      remainingMs: Math.max(0, delayMs),
      messageSpriteInstanceId,
      onComplete,
    };
  }

  private clearPendingStepMessage(): void {
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

  private resolveLineDuration(line: RoccoDialogueLine, ttlMs: number): number {
    return (typeof line === 'string' ? 1 : Math.max(1, line.length)) * ttlMs;
  }

  private resolveMessageText(line: RoccoDialogueLine): string | string[] {
    if (typeof line === 'string') {
      return line;
    }

    return [...line];
  }

  private createNpcMessageOptions(ttlMs: number): RoccoSpriteMessageOptions {
    return {
      ttlMs,
      ...(this.npcMessageStyle ? { style: this.npcMessageStyle } : {}),
    };
  }

  private resolveMenuLabel(line: RoccoDialogueLine): string {
    if (typeof line === 'string') {
      return line;
    }

    return line.join(' ');
  }
}
