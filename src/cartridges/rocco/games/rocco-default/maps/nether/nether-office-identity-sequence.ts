import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import { createRoccoDialogueChoiceMenu, RoccoDialogueSession } from '../../../../rpce/dialogue';
import type { RoccoLocalization } from '../../localization';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import type { NetherOfficeChoicePortalController } from './nether-office-choice-portals';
import { NetherOfficeFinalInteractionController } from './nether-office-final-interaction';
import { toOriginFromGroundPoint } from './nether-level-support';
import { startNetherResetOfficeGuyspriteArrival } from './nether-office-arrival-support';
import { NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE } from './nether-office-guysprite-interaction';
import type { NetherOfficeGuyspriteTargetShape } from './nether-office-guysprite-interaction';
import { startNetherOfficeIdentityFoolSequence } from './nether-office-identity-fool';

const IDENTITY_DIALOGUE_MENU_ID = 'rocco-nether-office-identity-menu';
const IDENTITY_FINAL_MENU_ID = 'rocco-nether-office-identity-final-menu';
const IDENTITY_ESCAPE_MENU_ID = 'rocco-nether-office-identity-escape-menu';
const IDENTITY_PATH_MENU_ID = 'rocco-nether-office-identity-path-menu';
const IDENTITY_DIALOGUE_TTL_MS = 5200;
const IDENTITY_PATH_MAX_CLARIFICATIONS = 3;
const IDENTITY_ROCCO_TARGET_GROUND_POINT = { x: 405, y: 459 } as const;
const IDENTITY_GUYSPRITE_TARGET_GROUND_POINT = { x: 712, y: 461 } as const;
const IDENTITY_GUYSPRITE_MOVE_SPEED = GUYSPRITE_CONFIG.motion.runSpeed * 1.5;

type IdentitySequencePhase =
  | 'idle'
  | 'calling-rocco'
  | 'moving-rocco'
  | 'identity-choice'
  | 'moving-guysprite-away'
  | 'resetting-rocco'
  | 'moving-guysprite-home'
  | 'confession'
  | 'final-choice'
  | 'escape-intro'
  | 'escape-choice'
  | 'path-introduction'
  | 'path-choice'
  | 'choice-portal-sequence';

interface IdentitySequenceOptions {
  guyspriteHomeGroundPoint: { x: number; y: number };
  guyspriteScale: number;
  roccoScale: number;
  onRoccoReset: (onComplete: () => void) => void;
  onGuyspriteHome: () => void;
  choicePortals: NetherOfficeChoicePortalController;
  guyspriteTargetShape: NetherOfficeGuyspriteTargetShape;
  requestFinalScreen: (
    invocation: import('../../../../levels/runtime/rocco-final-screen-session').RoccoFinalScreenInvocation,
  ) => void;
}

interface IdentityChoice {
  id: string;
  text: string;
}

export class NetherOfficeIdentitySequenceController {
  private readonly localization: RoccoLocalization;
  private readonly options: IdentitySequenceOptions;
  private engine: CartridgeSdkV1Runtime | undefined;
  private dialogue: RoccoDialogueSession | undefined;
  private phase: IdentitySequencePhase = 'idle';
  private movementInputLease: { dispose(): void } | undefined;
  private pathClarificationRound = 0;
  private readonly finalInteraction: NetherOfficeFinalInteractionController;

  constructor(localization: RoccoLocalization, options: IdentitySequenceOptions) {
    this.localization = localization;
    this.options = options;
    this.finalInteraction = new NetherOfficeFinalInteractionController(
      localization,
      options.choicePortals,
      options.guyspriteTargetShape,
      options.requestFinalScreen,
    );
  }

  private get text() {
    return this.localization.text.nether.officeReading;
  }

  private get identityChoices(): IdentityChoice[] {
    return this.text.identityChoices.map((text, index) => ({
      id: `identity-choice-${index + 1}`,
      text,
    }));
  }

  private get finalChoices(): IdentityChoice[] {
    return this.text.identityFinalChoices.map((text, index) => ({
      id: `identity-final-choice-${index + 1}`,
      text,
    }));
  }

  private get escapeChoices(): IdentityChoice[] {
    return this.text.identityEscapeChoices.map((text, index) => ({
      id: `identity-escape-choice-${index + 1}`,
      text,
    }));
  }

  private get pathChoices(): IdentityChoice[] {
    return this.text.identityPathChoices.map((text, index) => ({
      id: `identity-path-choice-${index + 1}`,
      text,
    }));
  }

  private isMenuPhase(): boolean {
    return [
      'identity-choice',
      'final-choice',
      'escape-choice',
      'path-choice',
      'portal-menu',
    ].includes(this.phase);
  }

  private openIdentityChoices(): void {
    if (!this.engine) {
      return;
    }

    this.phase = 'identity-choice';
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: IDENTITY_DIALOGUE_MENU_ID,
        choices: this.identityChoices,
      }).gridMenu,
    );
  }

  private openFinalChoices(): void {
    if (!this.engine) {
      return;
    }

    this.phase = 'final-choice';
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: IDENTITY_FINAL_MENU_ID,
        choices: this.finalChoices,
      }).gridMenu,
    );
  }

  private openEscapeChoices(): void {
    if (!this.engine) {
      return;
    }

    this.phase = 'escape-choice';
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: IDENTITY_ESCAPE_MENU_ID,
        choices: this.escapeChoices,
      }).gridMenu,
    );
  }

  private openPathChoices(): void {
    if (!this.engine) {
      return;
    }

    this.phase = 'path-choice';
    const choices =
      this.pathClarificationRound >= IDENTITY_PATH_MAX_CLARIFICATIONS
        ? this.pathChoices.slice(0, 2)
        : this.pathChoices;
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: IDENTITY_PATH_MENU_ID,
        choices,
      }).gridMenu,
    );
  }

  private startRoccoWalk(): void {
    if (!this.engine) return;

    this.phase = 'moving-rocco';
    this.movementInputLease = this.engine.acquireInputLease(
      'nether-office-identity-rocco-walk',
      'blocked',
    );
    this.engine.video.sprites.moveTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      toOriginFromGroundPoint(IDENTITY_ROCCO_TARGET_GROUND_POINT, this.options.roccoScale).x,
      toOriginFromGroundPoint(IDENTITY_ROCCO_TARGET_GROUND_POINT, this.options.roccoScale).y,
      {
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        idleAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
        constrainToWalkMap: false,
        stopDistance: 1,
      },
    );
  }

  private startReleaseSequence(): void {
    if (!this.engine) return;

    this.phase = 'moving-guysprite-away';
    this.movementInputLease = this.engine.acquireInputLease(
      'nether-office-identity-guysprite-walk',
      'blocked',
    );
    this.engine.video.sprites.playAction(
      GUYSPRITE_CONFIG.ids.instance,
      GUYSPRITE_CONFIG.ids.idleAction,
      {
        direction: 'right',
        restart: true,
      },
    );
    startNetherResetOfficeGuyspriteArrival(
      this.engine,
      toOriginFromGroundPoint(IDENTITY_GUYSPRITE_TARGET_GROUND_POINT, this.options.guyspriteScale),
      IDENTITY_GUYSPRITE_MOVE_SPEED,
    );
  }

  private startRoccoReset(): void {
    this.phase = 'resetting-rocco';
    this.options.onRoccoReset(() => this.startGuyspriteHomeWalk());
  }

  private startGuyspriteHomeWalk(): void {
    if (!this.engine) return;

    this.phase = 'moving-guysprite-home';
    this.engine.video.sprites.playAction(
      GUYSPRITE_CONFIG.ids.instance,
      GUYSPRITE_CONFIG.ids.idleAction,
      {
        direction: 'left',
        restart: true,
      },
    );
    startNetherResetOfficeGuyspriteArrival(
      this.engine,
      toOriginFromGroundPoint(this.options.guyspriteHomeGroundPoint, this.options.guyspriteScale),
      IDENTITY_GUYSPRITE_MOVE_SPEED,
    );
  }

  private startConfession(): void {
    this.movementInputLease?.dispose();
    this.movementInputLease = undefined;
    this.phase = 'confession';
    this.dialogue?.beginLinearSequence({
      speaker: 'npc',
      lines: this.text.identityConfessionLines,
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
      onComplete: () => this.openFinalChoices(),
    });
  }

  private startFinalReply(choice: IdentityChoice): void {
    const onComplete = () => this.startEscapeIntroduction();
    if (choice.id === 'identity-final-choice-1') {
      this.dialogue?.beginLinearSequence({
        speaker: 'npc',
        lines: this.text.identitySecurityReplyLines,
        lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
        messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
        onComplete,
      });
      return;
    }

    this.dialogue?.beginLinearSequence({
      speaker: 'npc',
      lines:
        choice.id === 'identity-final-choice-2'
          ? [this.text.identityHookReplyLine]
          : [this.text.identitySpriteReplyLine],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
      onComplete,
    });
  }

  private startEscapeIntroduction(): void {
    this.pathClarificationRound = 0;
    this.phase = 'escape-intro';
    this.dialogue?.beginLinearSequence({
      speaker: 'npc',
      lines: [this.text.identityEscapeIntroLine],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
      onComplete: () => this.openEscapeChoices(),
    });
  }

  private startPathIntroduction(choice: IdentityChoice): void {
    const lines =
      this.pathClarificationRound === 0
        ? this.text.identityPathLines
        : (this.text.identityPathClarificationLines[this.pathClarificationRound - 1] ??
          this.text.identityPathClarificationLines.at(-1) ??
          this.text.identityPathLines);
    this.phase = 'path-introduction';
    this.dialogue?.beginLinearSequence({
      speaker: 'player',
      lines: [choice.text],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      onComplete: () => {
        this.dialogue?.beginLinearSequence({
          speaker: 'npc',
          lines,
          lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
          messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
          onComplete: () => this.openPathChoices(),
        });
      },
    });
  }

  private startChoicePortalSequence(): void {
    if (!this.engine) {
      return;
    }

    this.phase = 'choice-portal-sequence';
    this.options.choicePortals.begin(
      this.engine,
      this.options.guyspriteScale,
      this.options.guyspriteHomeGroundPoint,
      () => {
        this.options.onGuyspriteHome();
        this.finalInteraction.activate(this.engine!);
        this.phase = 'choice-portal-sequence';
      },
    );
  }

  private handleIdentityChoice(itemId: string): void {
    const choice = this.identityChoices.find((candidate) => candidate.id === itemId);
    if (!choice || !this.engine) return;

    this.engine.video.gridMenus.closeMenu();
    this.phase = 'escape-intro';
    this.dialogue?.beginLinearSequence({
      speaker: 'player',
      lines: [choice.text],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      onComplete: () => {
        if (choice.id === 'identity-choice-4') {
          this.phase = 'escape-intro';
          startNetherOfficeIdentityFoolSequence(this.dialogue, this.text, () =>
            this.startReleaseSequence(),
          );
          return;
        }
        this.startReleaseSequence();
      },
    });
  }

  private handleFinalChoice(itemId: string): void {
    const choice = this.finalChoices.find((candidate) => candidate.id === itemId);
    if (!choice || !this.engine) return;

    this.engine.video.gridMenus.closeMenu();
    this.phase = 'escape-intro';
    this.dialogue?.beginLinearSequence({
      speaker: 'player',
      lines: [choice.text],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      onComplete: () => this.startFinalReply(choice),
    });
  }

  private handleIdentityMenuActivation(activation: RoccoGridMenuActivation): boolean {
    if (activation.definitionId !== IDENTITY_DIALOGUE_MENU_ID) return false;
    if (activation.interaction === 'close') this.openIdentityChoices();
    else if (activation.interaction === 'activate' && activation.itemId)
      this.handleIdentityChoice(activation.itemId);
    return true;
  }

  private handleFinalMenuActivation(activation: RoccoGridMenuActivation): boolean {
    if (activation.definitionId !== IDENTITY_FINAL_MENU_ID) return false;
    if (activation.interaction === 'close') this.openFinalChoices();
    else if (activation.interaction === 'activate' && activation.itemId)
      this.handleFinalChoice(activation.itemId);
    return true;
  }

  private handleEscapeMenuActivation(activation: RoccoGridMenuActivation): boolean {
    if (activation.definitionId !== IDENTITY_ESCAPE_MENU_ID) return false;
    if (activation.interaction === 'close') this.openEscapeChoices();
    else if (activation.interaction === 'activate' && activation.itemId) {
      const choice = this.escapeChoices.find((candidate) => candidate.id === activation.itemId);
      if (choice && this.engine) {
        this.engine.video.gridMenus.closeMenu();
        this.startPathIntroduction(choice);
      }
    }
    return true;
  }

  private handlePathMenuActivation(activation: RoccoGridMenuActivation): boolean {
    if (activation.definitionId !== IDENTITY_PATH_MENU_ID) return false;
    if (activation.interaction === 'close') this.openPathChoices();
    else if (activation.interaction === 'activate' && activation.itemId) {
      const choice = this.pathChoices.find((candidate) => candidate.id === activation.itemId);
      if (choice && this.engine) {
        this.engine.video.gridMenus.closeMenu();
        if (choice.id === 'identity-path-choice-3') {
          this.pathClarificationRound = Math.min(
            IDENTITY_PATH_MAX_CLARIFICATIONS,
            this.pathClarificationRound + 1,
          );
          this.startPathIntroduction(choice);
        } else {
          this.phase = 'path-introduction';
          this.dialogue?.beginLinearSequence({
            speaker: 'player',
            lines: [choice.text],
            lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
            onComplete: () => this.startChoicePortalSequence(),
          });
        }
      }
    }
    return true;
  }

  private handleMenuActivation(activation: RoccoGridMenuActivation): boolean {
    if (this.phase === 'identity-choice') return this.handleIdentityMenuActivation(activation);
    if (this.phase === 'final-choice') return this.handleFinalMenuActivation(activation);
    if (this.phase === 'escape-choice') return this.handleEscapeMenuActivation(activation);
    if (this.phase === 'path-choice') return this.handlePathMenuActivation(activation);
    return false;
  }

  private updateMovement(): void {
    if (!this.engine) {
      return;
    }

    if (this.phase === 'moving-rocco') {
      if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
        return;
      }

      this.movementInputLease?.dispose();
      this.movementInputLease = undefined;
      this.openIdentityChoices();
      return;
    }

    if (this.phase === 'moving-guysprite-away') {
      if (this.engine.video.sprites.isMoving(GUYSPRITE_CONFIG.ids.instance)) {
        return;
      }

      this.startRoccoReset();
      return;
    }

    if (this.phase === 'moving-guysprite-home') {
      if (this.engine.video.sprites.isMoving(GUYSPRITE_CONFIG.ids.instance)) {
        return;
      }

      this.options.onGuyspriteHome();
      this.startConfession();
    }
  }

  mount(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.pathClarificationRound = 0;
    this.dialogue = new RoccoDialogueSession({
      id: IDENTITY_DIALOGUE_MENU_ID,
      engine,
      playerSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
      npcSpriteInstanceId: GUYSPRITE_CONFIG.ids.instance,
      playerLineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      npcLineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
    });
  }

  unmount(): void {
    this.movementInputLease?.dispose();
    this.movementInputLease = undefined;
    this.dialogue?.cancel();
    this.dialogue = undefined;
    this.engine = undefined;
    this.phase = 'idle';
    this.pathClarificationRound = 0;
    this.finalInteraction.unmount();
  }

  get isActive(): boolean {
    return this.phase !== 'idle';
  }

  begin(): void {
    if (!this.engine || !this.dialogue || this.isActive) {
      return;
    }

    this.phase = 'calling-rocco';
    this.dialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [this.text.identityCallLine],
      lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
      messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
      onComplete: () => this.startRoccoWalk(),
    });
  }

  update(deltaMs: number): void {
    this.dialogue?.update(deltaMs);
    this.finalInteraction.update(deltaMs);
    if (this.phase === 'choice-portal-sequence') {
      this.options.choicePortals.update(deltaMs);
    }
    this.updateMovement();
  }

  handleAction(_activation: any): boolean {
    return false;
  }

  handleGridMenu(_activation: RoccoGridMenuActivation): boolean {
    // No se usa en esta secuencia después de la conversación del cartucho faltante
    return false;
  }

  handleSceneClick(_action: RoccoSceneClickAction): CartridgeActionDisposition | void {
    // El handler del cartucho faltante no se usa directamente aquí
    const finalDisposition = this.finalInteraction.handleSceneClick(_action);
    if (finalDisposition) return finalDisposition;
    if (!this.isActive) {
      return undefined;
    }

    if (!this.isMenuPhase()) {
      this.dialogue?.advance();
    }
    return { consumed: true, defaultPlayerMovement: 'suppress' };
  }
}
