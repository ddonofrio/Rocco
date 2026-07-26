import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoGraphicPlane } from '../../../../../../console/video/planes';
import { RoccoDialogueSession, roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import type { RoccoLocalization } from '../../localization';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import { netherResetOfficeSecondAssetUrls } from './nether-assets';
import {
  PRINTER_READING_DETAIL_MENU_ID,
  PRINTER_READING_DETAIL_MORE_ID,
  PRINTER_READING_DETAIL_REPLY_ID,
  PRINTER_READING_REPLY_CONTRARY_ID,
  PRINTER_READING_REPLY_IDS,
  PRINTER_READING_REPLY_SAY_ID,
  createPrinterReadingDetailMenuDefinition,
  createPrinterReadingReplyMenuDefinition,
  resolvePrinterMessageContraryText,
  resolvePrinterMessageText,
  splitPrinterSpeechText,
} from './nether-reset-office-second-printer-content';

const PRINTER_TARGET_ID = 'rocco-nether-reset-office-second-printer-target';
const PRINTER_DEFINITION_ID = 'rocco-nether-printer';
const PRINTER_ACTION_MENU_ID = 'rocco-nether-reset-office-second-printer-action-menu';
const PRINTER_SHAPE = {
  kind: 'rect' as const,
  x: 24,
  y: 207,
  width: 236,
  height: 295,
};
const PRINTER_INTERACTION_POINT = { x: 260, y: 492 } as const;
const PRINTER_READ_DELAY_MS = 250;
const PRINTER_READ_INPUT_LEASE_ID = 'nether-office-second-printer-read';
const PRINTER_GRAB_HISTORY_KEY = 'nether-office-second-printer-grab';
const PRINTER_KICK_HISTORY_KEY = 'nether-office-second-printer-kick';
const PRINTER_UNREADABLE_REPLY_HISTORY_KEY = 'nether-office-second-printer-unreadable-reply';
const PRINTER_READING_PLANE_ID = 'rocco-nether-reset-office-second-printer-reading';
const PRINTER_READING_TARGET_PREFIX = 'rocco-nether-reset-office-second-printer-reading-target';
const PRINTER_READING_TARGET_COUNT = 15;
const PRINTER_READING_TARGET_X = 234;
const PRINTER_READING_TARGET_Y = 0;
const PRINTER_READING_TARGET_WIDTH = 492;
const PRINTER_READING_TARGET_HEIGHT = 34;
const PRINTER_READING_TARGET_STEP_Y = 35;
const PRINTER_READING_TARGET_IDS = Array.from(
  { length: PRINTER_READING_TARGET_COUNT },
  (_, index) => `${PRINTER_READING_TARGET_PREFIX}-${String(index + 1).padStart(2, '0')}`,
);
const PRINTER_READING_TARGET_DEFINITION_ID = 'rocco-nether-printer-reading-message';
const PRINTER_READING_SPEECH_SESSION_ID = 'nether-office-second-printer-speech';
const PRINTER_READING_IMAGE_WIDTH = ROCCO_DESIGN_WIDTH;
const PRINTER_READING_IMAGE_HEIGHT = 520;
const PRINTER_READING_FACING = 'up-left' as const;

export const NETHER_RESET_OFFICE_SECOND_PRINTER_READING_PLANE: RoccoGraphicPlane = {
  id: PRINTER_READING_PLANE_ID,
  name: 'Nether Reset Office Second Printer Reading',
  enabled: true,
  source: {
    kind: 'image',
    uri: netherResetOfficeSecondAssetUrls.printerFront,
    width: PRINTER_READING_IMAGE_WIDTH,
    height: PRINTER_READING_IMAGE_HEIGHT,
  },
  colorModel: { kind: 'native' },
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
  scroll: { x: 0, y: 0 },
  wrap: { x: false, y: false },
  viewport: {
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
  },
  opacity: 1,
  priority: 120,
  renderLayer: 'foreground',
  visible: false,
};

type PrinterReadSequence = {
  phase: 'walking' | 'facing-delay';
  elapsedMs: number;
};

export class NetherResetOfficeSecondPrinterController {
  private readonly localization: RoccoLocalization;
  private readonly sceneId: string;
  private engine: CartridgeSdkV1Runtime | undefined;
  private readSequence: PrinterReadSequence | undefined;
  private readInputLease: { dispose(): void } | undefined;
  private readingVisible = false;
  private readingDetailVisible = false;
  private readingReplyChoicesVisible = false;
  private readingMessageText: string | undefined;
  private readingMessageContraryText: string | undefined;
  private speechDialogue: RoccoDialogueSession | undefined;

  constructor(localization: RoccoLocalization, sceneId: string) {
    this.localization = localization;
    this.sceneId = sceneId;
  }

  private createActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      id: PRINTER_ACTION_MENU_ID,
      targetInstanceIds: [PRINTER_TARGET_ID],
      renderLayer: 'ui.action-menu',
      itemSize: 92,
      orbitRadius: 88,
      orbitSpeedRadiansPerSecond: 0.08,
      hoverScale: 1.16,
      circleFill: '#0f1610',
      circleStroke: '#d7e6c5',
      circleStrokeWidth: 2,
      items: [
        {
          id: 'read',
          actionId: 'read',
          label: this.localization.text.nether.printer.readLabel,
          imageUri: ROCCO_ACTION_MENU_ASSETS.look,
        },
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
        },
      ],
    };
  }

  private uninstallInteraction(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(PRINTER_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(PRINTER_TARGET_ID);
    for (const targetId of PRINTER_READING_TARGET_IDS) {
      engine.video.sceneTargets?.unregisterTarget(targetId);
    }
  }

  private showThoughtLines(lines: string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      lines,
      { ttlMs: 4200 },
      { count: 1, historyKey, isAvoidImmediateRepeat: true },
    );
  }

  private startReadSequence(): void {
    if (!this.engine || this.readingVisible || this.readSequence) {
      return;
    }

    const isStarted = this.engine.video.sprites.goTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      PRINTER_INTERACTION_POINT.x,
      PRINTER_INTERACTION_POINT.y,
      {
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        constrainToWalkMap: false,
        idleAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      return;
    }

    this.readSequence = { phase: 'walking', elapsedMs: 0 };
    this.readInputLease = this.engine.acquireInputLease(PRINTER_READ_INPUT_LEASE_ID, 'blocked');
  }

  private cancelReadSequence(): void {
    this.readSequence = undefined;
    this.readInputLease?.dispose();
    this.readInputLease = undefined;
  }

  private openReadingDetail(targetId: string): void {
    const messageText = resolvePrinterMessageText(
      PRINTER_READING_TARGET_IDS,
      targetId,
      this.localization.text.nether.printer,
    );
    if (!this.engine?.video.gridMenus || !this.readingVisible || !messageText) {
      return;
    }

    this.readingMessageText = messageText;
    this.readingMessageContraryText = resolvePrinterMessageContraryText(
      PRINTER_READING_TARGET_IDS,
      targetId,
      this.localization.text.nether.printer,
    );
    this.readingReplyChoicesVisible = false;
    this.readingDetailVisible = true;
    this.engine.video.gridMenus.openMenu(
      createPrinterReadingDetailMenuDefinition(this.localization.text.nether.printer, messageText),
    );
  }

  private closeReadingDetailToList(): void {
    this.readingDetailVisible = false;
    this.readingReplyChoicesVisible = false;
    this.readingMessageText = undefined;
    this.readingMessageContraryText = undefined;
    this.engine?.video.gridMenus?.closeMenu();
    this.syncReadingPresentation();
  }

  private exitReadingToOffice(): void {
    this.readingVisible = false;
    this.readingDetailVisible = false;
    this.engine?.video.gridMenus?.closeMenu();
    this.syncReadingPresentation();
  }

  private finishReadingReply(replyId: string): void {
    if (!this.engine || !this.readingMessageText) {
      return;
    }

    const messageText = this.readingMessageText;
    if (replyId === PRINTER_READING_REPLY_SAY_ID) {
      this.closeReadingDetailToList();
      this.speechDialogue?.beginLinearSequence({
        speaker: 'player',
        lines: [splitPrinterSpeechText(messageText)],
        lineTtlMs: 60_000,
        messageOptions: { id: PRINTER_READING_SPEECH_SESSION_ID },
      });
      return;
    }

    const contraryText = this.readingMessageContraryText;
    if (replyId === PRINTER_READING_REPLY_CONTRARY_ID) {
      if (!contraryText) {
        return;
      }

      this.closeReadingDetailToList();
      this.speechDialogue?.beginLinearSequence({
        speaker: 'player',
        lines: [splitPrinterSpeechText(contraryText)],
        lineTtlMs: 60_000,
        messageOptions: { id: PRINTER_READING_SPEECH_SESSION_ID },
      });
      return;
    }

    const printerText = this.localization.text.nether.printer;
    roccoCartridgeMessageRuntime.say(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      printerText.replyUnreadableLines,
      { ttlMs: 5200 },
      {
        count: 1,
        historyKey: PRINTER_UNREADABLE_REPLY_HISTORY_KEY,
        isAvoidImmediateRepeat: true,
      },
    );

    this.closeReadingDetailToList();
  }

  private reopenReadingMenu(): void {
    if (!this.engine) {
      return;
    }

    const printerText = this.localization.text.nether.printer;
    if (this.readingReplyChoicesVisible) {
      this.engine.video.gridMenus?.openMenu(createPrinterReadingReplyMenuDefinition(printerText));
      return;
    }

    if (this.readingMessageText) {
      this.engine.video.gridMenus?.openMenu(
        createPrinterReadingDetailMenuDefinition(printerText, this.readingMessageText),
      );
    }
  }

  private openReadingReplyChoices(): void {
    this.engine?.video.gridMenus?.openMenu(
      createPrinterReadingReplyMenuDefinition(this.localization.text.nether.printer),
    );
  }

  private syncReadingPresentation(): void {
    if (!this.engine) {
      return;
    }

    const readingPlane = this.engine.video.planes?.resolvePlane?.(
      this.sceneId,
      PRINTER_READING_PLANE_ID,
    );
    if (readingPlane) {
      this.engine.video.planes.updatePlane(this.sceneId, PRINTER_READING_PLANE_ID, {
        visible: this.readingVisible,
      });
    }

    for (const targetId of PRINTER_READING_TARGET_IDS) {
      this.engine.video.sceneTargets?.unregisterTarget(targetId);
    }

    if (!this.readingVisible) {
      return;
    }

    for (const [index, targetId] of PRINTER_READING_TARGET_IDS.entries()) {
      const messageNumber = index + 1;
      this.engine.video.sceneTargets?.registerTarget({
        instanceId: targetId,
        definitionId: PRINTER_READING_TARGET_DEFINITION_ID,
        renderPlaneId: PRINTER_READING_PLANE_ID,
        shape: {
          kind: 'rect',
          x: PRINTER_READING_TARGET_X,
          y: PRINTER_READING_TARGET_Y + index * PRINTER_READING_TARGET_STEP_Y,
          width: PRINTER_READING_TARGET_WIDTH,
          height: PRINTER_READING_TARGET_HEIGHT,
        },
        priority: 130,
        suppressDefaultPlayerMove: true,
        visibleDescription: {
          enabled: true,
          text:
            this.localization.locale === 'es'
              ? `Leer mensaje ${messageNumber}`
              : `Read message ${messageNumber}`,
        },
      });
    }
  }

  private hideReading(): void {
    this.readingVisible = false;
    this.readingDetailVisible = false;
    this.readingReplyChoicesVisible = false;
    this.readingMessageText = undefined;
    this.readingMessageContraryText = undefined;
    this.engine?.video.gridMenus?.closeMenu();
    this.syncReadingPresentation();
  }

  update(deltaMs: number): void {
    this.speechDialogue?.update(deltaMs);
    if (!this.engine || !this.readSequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    if (!this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance)) {
      this.cancelReadSequence();
      return;
    }

    if (this.readSequence.phase === 'walking') {
      if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
        return;
      }

      this.engine.video.sprites.playAction(
        ROCCO_PLAYER_CONFIG.ids.instance,
        ROCCO_PLAYER_CONFIG.ids.idleAction,
        { direction: PRINTER_READING_FACING, restart: true },
      );
      this.readSequence = { phase: 'facing-delay', elapsedMs: 0 };
      return;
    }

    this.readSequence.elapsedMs += deltaMs;
    if (this.readSequence.elapsedMs < PRINTER_READ_DELAY_MS) {
      return;
    }

    this.readSequence = undefined;
    this.readInputLease?.dispose();
    this.readInputLease = undefined;
    this.readingVisible = true;
    this.syncReadingPresentation();
  }

  reset(engine: CartridgeSdkV1Runtime): void {
    this.speechDialogue?.cancel();
    this.engine = engine;
    this.cancelReadSequence();
    this.readingVisible = false;
    this.readingDetailVisible = false;
    this.readingReplyChoicesVisible = false;
    this.readingMessageText = undefined;
    this.readingMessageContraryText = undefined;
    engine.video.gridMenus?.closeMenu();
    this.speechDialogue = new RoccoDialogueSession({
      id: PRINTER_READING_SPEECH_SESSION_ID,
      engine,
      playerSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
      npcSpriteInstanceId: ROCCO_PLAYER_CONFIG.ids.instance,
      playerLineTtlMs: 60_000,
      npcLineTtlMs: 60_000,
    });
  }

  installInteraction(engine: CartridgeSdkV1Runtime, backgroundPlaneId: string): void {
    engine.video.sceneTargets?.unregisterTarget(PRINTER_TARGET_ID);
    engine.video.sceneTargets?.registerTarget({
      instanceId: PRINTER_TARGET_ID,
      definitionId: PRINTER_DEFINITION_ID,
      renderPlaneId: backgroundPlaneId,
      shape: PRINTER_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.nether.printer.description,
      },
    });
    engine.video.actionMenus.unregisterMenu(PRINTER_ACTION_MENU_ID);
    engine.video.actionMenus.registerMenu(this.createActionMenuDefinition());
  }

  handleAction(activation: RoccoActionMenuActivation): boolean {
    if (activation.targetInstanceId !== PRINTER_TARGET_ID) {
      return false;
    }

    this.engine?.video.actionMenus.closeMenu();
    switch (activation.actionId) {
      case 'read': {
        this.startReadSequence();
        break;
      }
      case 'kick': {
        this.showThoughtLines(
          this.localization.text.nether.printer.kickLines,
          PRINTER_KICK_HISTORY_KEY,
        );
        break;
      }
      case 'grab': {
        this.showThoughtLines(
          this.localization.text.nether.printer.grabLines,
          PRINTER_GRAB_HISTORY_KEY,
        );
        break;
      }
    }
    return true;
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    if (this.speechDialogue?.isActive()) {
      this.speechDialogue.advance();
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.readSequence) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.readingDetailVisible) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.readingReplyChoicesVisible) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (this.readingVisible) {
      const clickedTargetId = activation.targetInstanceId;
      if (clickedTargetId && PRINTER_READING_TARGET_IDS.includes(clickedTargetId)) {
        this.openReadingDetail(clickedTargetId);
      } else {
        this.hideReading();
      }
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (
      (!this.readingDetailVisible && !this.readingReplyChoicesVisible) ||
      activation.definitionId !== PRINTER_READING_DETAIL_MENU_ID
    ) {
      return;
    }

    if (activation.interaction === 'close') {
      this.reopenReadingMenu();
      return;
    }

    if (activation.interaction !== 'activate') {
      return;
    }

    if (this.readingReplyChoicesVisible) {
      if (activation.itemId && PRINTER_READING_REPLY_IDS.has(activation.itemId)) {
        this.finishReadingReply(activation.itemId);
      }
      return;
    }

    if (activation.itemId === PRINTER_READING_DETAIL_MORE_ID) {
      this.closeReadingDetailToList();
      return;
    }

    if (activation.itemId === PRINTER_READING_DETAIL_REPLY_ID) {
      this.exitReadingToOffice();
      this.readingReplyChoicesVisible = true;
      this.openReadingReplyChoices();
    }
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.cancelReadSequence();
    this.speechDialogue?.cancel();
    this.speechDialogue = undefined;
    this.hideReading();
    this.uninstallInteraction(engine);
    this.engine = undefined;
  }
}
