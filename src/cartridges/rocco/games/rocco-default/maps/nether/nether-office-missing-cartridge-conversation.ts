import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { ROCCO_PLAYER_CONFIG } from '../../player/rocco-player-config';

export class NetherOfficeMissingCartridgeConversation {
  private readonly roccoSpriteId: string | undefined = ROCCO_PLAYER_CONFIG?.ids.instance;
  
  constructor(private readonly engine: CartridgeSdkV1Runtime) {}

  update(): void {
    this.start();
  }

  start(): void {
    // Paso 1: Rocco pregunta "¿qué cartucho?"
    setTimeout(() => this.showText('¿qué cartucho?'), 3000);
    
    // Paso 2: Guysprite explica sobre los cartuchos (3s después del paso 1)
    setTimeout(() => this.showText('Este juego se compone de...\n\n...varios cartuchos, como capítulos...'), 6000);
    
    // Paso 3: Rocco pregunta "¿Y ahora qué hacemos?" (3s después del paso 2)
    setTimeout(() => this.showText('¿Y ahora qué hacemos?'), 9000);
    
    // Paso 4: Guysprite sugiere pizzas (3s después del paso 3)
    setTimeout(() => this.showText('¿Nos hacemos unas...\n\n...pizzas al microhondas?\nYa hace hambre.'), 12000);
    
    // Paso final: Rocco acepta (3s después del paso 4)
    setTimeout(() => this.showText('vale'), 15000);
  }

  private showText(text: string): void {
    // Mostrar el texto usando un sprite genérico o la ID de Rocco si existe
    const spriteId = this.roccoSpriteId;
    if (spriteId) {
      this.engine.video.messages.say(spriteId, text, {});
    } else {
      // Fallback: mostrar en un sprite genérico
      this.engine.video.messages.say('guysprite-1', text, {});
    }
  }
}
