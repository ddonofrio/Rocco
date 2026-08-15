import type { CartridgeActionDisposition, RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { clearNetherOfficeRetryBlackout } from './nether-office-blackout';
import { NetherOfficeMissingCartridgeConversation } from './nether-office-missing-cartridge-conversation';

export class NetherOfficeFinalInteractionController {
  private readonly choicePortals: any; // Usar `any` para evitar tipos complejos en esta implementación simplificada
  private readonly guyspriteTargetShape: any;
  private readonly requestFinalScreen: (invocation: any) => void;
  private engine: CartridgeSdkV1Runtime | undefined;
  private active = false;
  private missingCartridgeConversation?: NetherOfficeMissingCartridgeConversation;

  constructor(
    _localization: any,
    choicePortals: any,
    _guyspriteTargetShape: any, // No se usa directamente en esta implementación simplificada
    requestFinalScreen: (invocation: any) => void,
    _legacyCompletion?: () => void,
  ) {
    this.choicePortals = choicePortals;
    this.requestFinalScreen = requestFinalScreen;
  }

  activate(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.active = true;
    this.missingCartridgeConversation = new NetherOfficeMissingCartridgeConversation(this.engine);
  }

  unmount(): void {
    if (this.engine) clearNetherOfficeRetryBlackout(this.engine);
    this.engine = undefined;
    this.active = false;
    this.missingCartridgeConversation = undefined;
  }

  update(): void {
    // Manejar la conversación del cartucho faltante primero
    if (this.missingCartridgeConversation) {
      this.missingCartridgeConversation.update();
      
      // Cuando la conversación termina, invocar el final-screen
      const conversationState = (this.missingCartridgeConversation as any)?.state;
      if (conversationState?.step === 'completed') {
        this.requestFinalScreen({ kind: 'game-console-missing' });
        return;
      }
    }
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    if (!this.active || !this.engine) return undefined;
    
    // Manejar clics en portales para elegir ir al juego o a la CPU
    const portalChoice = this.choicePortals.getChoiceAt?.(activation.sceneX, activation.sceneY);
    if (portalChoice) {
      if (portalChoice === 'game') {
        this.requestFinalScreen({ kind: 'game-superpowers' });
      } else if (portalChoice === 'console') {
        // Iniciar conversación del cartucho faltante
        this.missingCartridgeConversation?.start();
      }
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }
    
    // Manejar clics en Guysprite para abrir el menú de la consola
    // Esta funcionalidad ya no se usa porque la conversación del cartucho faltante maneja todo el flujo
    return undefined;
  }
}
