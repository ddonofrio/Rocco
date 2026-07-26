import type { CartridgeActionDisposition } from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import { createRoccoDialogueChoiceMenu, RoccoDialogueSession } from '../../../../rpce/dialogue';
import type { RoccoLocalization } from '../../localization';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE } from './nether-office-guysprite-interaction';

const NETHER_OFFICE_DIALOGUE_MENU_ID = 'rocco-nether-office-dialogue-menu';
const NETHER_OFFICE_DIALOGUE_PLAYER_TTL_MS = 4200;
const NETHER_OFFICE_DIALOGUE_GUYSPRITE_TTL_MS = 5200;
const NETHER_OFFICE_DIALOGUE_SYSTEM_BEEP_MESSAGE_ID = 'rocco-nether-office-system-beeps';
const NETHER_OFFICE_DIALOGUE_SYSTEM_BEEP_OFFSET = { x: 0, y: 220 } as const;

type NetherOfficeDialogueStage =
  | 'idle'
  | 'awaiting-first-choice'
  | 'first-player'
  | 'first-guysprite'
  | 'awaiting-second-choice'
  | 'second-player'
  | 'second-guysprite'
  | 'awaiting-third-choice'
  | 'third-player'
  | 'post-coffee'
  | 'final-guysprite';

interface NetherOfficeDialogueChoice {
  id: string;
  label: string;
  reply: string;
}

export class RoccoNetherOfficeDialogueController {
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly localization: RoccoLocalization;
  private readonly dialogue: RoccoDialogueSession;
  private currentChoices: NetherOfficeDialogueChoice[] = [];
  private stage: NetherOfficeDialogueStage = 'idle';
  private onComplete: (() => void) | undefined;

  constructor(engine: CartridgeSdkV1Runtime, localization: RoccoLocalization) {
    this.engine = engine;
    this.localization = localization;
    this.dialogue = new RoccoDialogueSession({
      id: NETHER_OFFICE_DIALOGUE_MENU_ID,
      engine,
      playerSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
      npcSpriteInstanceId: GUYSPRITE_CONFIG.ids.instance,
      playerLineTtlMs: NETHER_OFFICE_DIALOGUE_PLAYER_TTL_MS,
      npcLineTtlMs: NETHER_OFFICE_DIALOGUE_GUYSPRITE_TTL_MS,
    });
  }

  private get text() {
    return this.localization.text.nether.officeArrival.dialogue;
  }

  private createChoices(
    prefix: string,
    entries: readonly { label: string; reply: string }[],
  ): NetherOfficeDialogueChoice[] {
    return entries.map((entry, index) => ({
      id: `${prefix}-${index + 1}`,
      label: entry.label,
      reply: entry.reply,
    }));
  }

  private isAwaitingChoice(): boolean {
    return ['awaiting-first-choice', 'awaiting-second-choice', 'awaiting-third-choice'].includes(
      this.stage,
    );
  }

  private openChoices(
    stage: NetherOfficeDialogueStage,
    choices: NetherOfficeDialogueChoice[],
  ): void {
    this.stage = stage;
    this.currentChoices = choices;
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: NETHER_OFFICE_DIALOGUE_MENU_ID,
        choices: choices.map((choice) => ({ id: choice.id, text: choice.label })),
      }).gridMenu,
    );
  }

  private openFirstChoices(): void {
    this.openChoices('awaiting-first-choice', this.createChoices('first', this.text.firstChoices));
  }

  private openSecondChoices(): void {
    this.openChoices(
      'awaiting-second-choice',
      this.createChoices('second', this.text.secondChoices),
    );
  }

  private openThirdChoices(): void {
    this.openChoices('awaiting-third-choice', this.createChoices('third', this.text.thirdChoices));
  }

  private startGuyspriteLines(lines: readonly string[], onComplete: () => void): void {
    if (this.stage === 'first-player') {
      this.stage = 'first-guysprite';
    } else if (this.stage === 'second-player') {
      this.stage = 'second-guysprite';
    } else {
      this.stage = 'final-guysprite';
    }
    this.startNextGuyspriteLine(lines, onComplete);
  }

  private startNextGuyspriteLine(lines: readonly string[], onComplete: () => void): void {
    const [line, ...remainingLines] = lines;
    if (!line) {
      onComplete();
      return;
    }

    this.dialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [line],
      lineTtlMs: NETHER_OFFICE_DIALOGUE_GUYSPRITE_TTL_MS,
      messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
      onComplete: () => {
        this.startNextGuyspriteLine(remainingLines, onComplete);
      },
    });
  }

  private resolveGuyspriteLines(stage: NetherOfficeDialogueStage): readonly string[] {
    if (stage === 'awaiting-first-choice') {
      return this.text.firstGuyspriteLines;
    }
    if (stage === 'awaiting-second-choice') {
      return this.text.secondGuyspriteLines;
    }
    return this.text.finalGuyspriteLines;
  }

  private resolveNextStep(stage: NetherOfficeDialogueStage): () => void {
    if (stage === 'awaiting-first-choice') {
      return () => this.openSecondChoices();
    }
    if (stage === 'awaiting-second-choice') {
      return () => this.openThirdChoices();
    }
    return () => this.startPostCoffeeSequence();
  }

  private startPostCoffeeSequence(): void {
    this.stage = 'post-coffee';
    this.dialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [this.text.systemBeepsLine],
      lineTtlMs: NETHER_OFFICE_DIALOGUE_GUYSPRITE_TTL_MS,
      messageOptions: {
        id: NETHER_OFFICE_DIALOGUE_SYSTEM_BEEP_MESSAGE_ID,
        side: 'left',
        offset: NETHER_OFFICE_DIALOGUE_SYSTEM_BEEP_OFFSET,
        maxWidth: 420,
        style: { showSpeechTail: false },
      },
      onComplete: () =>
        this.startNextGuyspriteLine(this.text.postCoffeeGuyspriteLines, () => this.finish()),
    });
  }

  private setPlayerStage(stage: NetherOfficeDialogueStage): void {
    if (stage === 'awaiting-first-choice') {
      this.stage = 'first-player';
    } else if (stage === 'awaiting-second-choice') {
      this.stage = 'second-player';
    } else {
      this.stage = 'third-player';
    }
  }

  private startChoice(choice: NetherOfficeDialogueChoice): void {
    const selectedStage = this.stage;
    const nextLines = this.resolveGuyspriteLines(selectedStage);
    const next = this.resolveNextStep(selectedStage);
    this.setPlayerStage(selectedStage);
    this.dialogue.beginLinearSequence({
      speaker: 'player',
      lines: [choice.reply],
      lineTtlMs: NETHER_OFFICE_DIALOGUE_PLAYER_TTL_MS,
      onComplete: () => this.startGuyspriteLines(nextLines, next),
    });
  }

  private finish(): void {
    this.dialogue.cancel();
    this.currentChoices = [];
    this.stage = 'idle';
    const onComplete = this.onComplete;
    this.onComplete = undefined;
    onComplete?.();
  }

  begin(onComplete: () => void): void {
    if (this.stage !== 'idle') {
      return;
    }

    this.onComplete = onComplete;
    this.openFirstChoices();
  }

  update(deltaMs: number): void {
    this.dialogue.update(deltaMs);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (activation.definitionId !== NETHER_OFFICE_DIALOGUE_MENU_ID || !this.isAwaitingChoice()) {
      return;
    }

    if (activation.interaction === 'close') {
      this.openChoices(this.stage, this.currentChoices);
      return;
    }

    if (activation.interaction !== 'activate') {
      return;
    }

    const choice = this.currentChoices.find((candidate) => candidate.id === activation.itemId);
    if (choice) {
      this.startChoice(choice);
    }
  }

  handleSceneClick(): CartridgeActionDisposition | void {
    if (this.stage === 'idle') {
      return undefined;
    }

    if (!this.isAwaitingChoice()) {
      this.dialogue.advance();
    }

    return { consumed: true, defaultPlayerMovement: 'suppress' };
  }

  cancel(): void {
    this.dialogue.cancel();
    this.currentChoices = [];
    this.stage = 'idle';
    this.onComplete = undefined;
  }
}
