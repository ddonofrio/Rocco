import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoLocalization } from '../../localization';
import {
  canOpenNetherOfficeGuyspriteMenuAt,
  didHandleNetherOfficeGuyspriteAction,
  type NetherOfficeGuyspriteTargetShape,
} from './nether-office-guysprite-interaction';
import {
  createNetherOfficeCartridgeMenu,
  NETHER_OFFICE_CARTRIDGE_MENU_ID,
  NETHER_OFFICE_CARTRIDGE_MISSING_BUTTON_ID,
  NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID,
} from './nether-office-cartridge-menu';
import {
  clearNetherOfficeRetryBlackout,
  showNetherOfficeRetryBlackout,
} from './nether-office-blackout';
import type { RoccoFinalScreenInvocation } from '../../../../levels/runtime/rocco-final-screen-session';
import type {
  NetherOfficeChoicePortalController,
  NetherOfficePortalChoice,
} from './nether-office-choice-portals';

const NETHER_OFFICE_CARTRIDGE_RETRY_MIN_MS = 250;
const NETHER_OFFICE_CARTRIDGE_RETRY_MAX_MS = 1000;

function resolveRandomUnit(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4_294_967_296;
}

export class NetherOfficeFinalInteractionController {
  private readonly localization: RoccoLocalization;
  private readonly choicePortals: NetherOfficeChoicePortalController;
  private readonly guyspriteTargetShape: NetherOfficeGuyspriteTargetShape;
  private readonly requestFinalScreen: (invocation: RoccoFinalScreenInvocation) => void;
  private engine: CartridgeSdkV1Runtime | undefined;
  private active = false;
  private cartridgeRetryChoice: NetherOfficePortalChoice | undefined;
  private cartridgeRetryElapsedMs = 0;
  private cartridgeRetryDurationMs = 0;

  constructor(
    localization: RoccoLocalization,
    choicePortals: NetherOfficeChoicePortalController,
    guyspriteTargetShape: NetherOfficeGuyspriteTargetShape,
    requestFinalScreen: (invocation: RoccoFinalScreenInvocation) => void,
    _legacyCompletion?: () => void,
  ) {
    this.localization = localization;
    this.choicePortals = choicePortals;
    this.guyspriteTargetShape = guyspriteTargetShape;
    this.requestFinalScreen = requestFinalScreen;
  }

  private get text() {
    return this.localization.text.nether.officeReading;
  }

  private openCartridgeMenu(choice: NetherOfficePortalChoice): void {
    if (!this.engine) return;
    const prompt =
      choice === 'console' ? this.text.chapter2CartridgePrompt : this.text.chapter3CartridgePrompt;
    this.engine.video.gridMenus.openMenu(
      createNetherOfficeCartridgeMenu(
        prompt,
        this.text.missingCartridgeButton,
        this.text.cartridgeOkButton,
      ),
    );
  }

  private openPortalMenu(choice: NetherOfficePortalChoice): void {
    if (choice === 'game') {
      this.requestFinalScreen({ kind: 'game-superpowers' });
      return;
    }
    this.openCartridgeMenu(choice);
  }

  private beginCartridgeRetry(): void {
    if (!this.engine) return;
    this.active = false;
    this.cartridgeRetryChoice = 'console';
    this.cartridgeRetryElapsedMs = 0;
    this.cartridgeRetryDurationMs =
      NETHER_OFFICE_CARTRIDGE_RETRY_MIN_MS +
      resolveRandomUnit() *
        (NETHER_OFFICE_CARTRIDGE_RETRY_MAX_MS - NETHER_OFFICE_CARTRIDGE_RETRY_MIN_MS);
    showNetherOfficeRetryBlackout(this.engine);
  }

  private handleCartridgeMenu(activation: RoccoGridMenuActivation): boolean {
    if (activation.definitionId !== NETHER_OFFICE_CARTRIDGE_MENU_ID) return false;
    if (activation.interaction === 'close') return true;
    if (activation.interaction !== 'button') return true;
    if (activation.buttonId === NETHER_OFFICE_CARTRIDGE_MISSING_BUTTON_ID) {
      this.active = false;
      this.requestFinalScreen({ kind: 'game-console-missing' });
    }
    if (activation.buttonId === NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID) this.beginCartridgeRetry();
    return true;
  }

  activate(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.active = true;
    this.cartridgeRetryChoice = undefined;
    this.cartridgeRetryElapsedMs = 0;
    this.cartridgeRetryDurationMs = 0;
  }

  unmount(): void {
    if (this.engine) clearNetherOfficeRetryBlackout(this.engine);
    this.engine = undefined;
    this.active = false;
    this.cartridgeRetryChoice = undefined;
    this.cartridgeRetryElapsedMs = 0;
    this.cartridgeRetryDurationMs = 0;
  }

  update(deltaMs: number): void {
    if (!this.engine || !this.cartridgeRetryChoice || !Number.isFinite(deltaMs) || deltaMs <= 0)
      return;
    this.cartridgeRetryElapsedMs += deltaMs;
    if (this.cartridgeRetryElapsedMs < this.cartridgeRetryDurationMs) return;
    const choice = this.cartridgeRetryChoice;
    this.cartridgeRetryChoice = undefined;
    this.cartridgeRetryElapsedMs = 0;
    this.cartridgeRetryDurationMs = 0;
    this.active = true;
    clearNetherOfficeRetryBlackout(this.engine);
    this.openCartridgeMenu(choice);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): boolean {
    return this.active && this.handleCartridgeMenu(activation);
  }

  handleAction(activation: RoccoActionMenuActivation): boolean {
    if (!this.active || !this.engine) return false;
    return didHandleNetherOfficeGuyspriteAction(this.engine, this.localization, activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    if (!this.active || !this.engine) return undefined;
    const portalChoice = this.choicePortals.getChoiceAt(activation.sceneX, activation.sceneY);
    if (portalChoice) {
      this.openPortalMenu(portalChoice);
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }
    canOpenNetherOfficeGuyspriteMenuAt(
      this.engine,
      activation.sceneX,
      activation.sceneY,
      this.guyspriteTargetShape,
    );
    return { consumed: true, defaultPlayerMovement: 'suppress' };
  }
}
