import type { RoccoTextCatalog } from '../types';

export const spanishBaitBucketText: RoccoTextCatalog['baitBucket'] = {
  normalLookLines: [
    'Una cubeta de cebo. Algo ahí dentro todavía quiere seguir vivo.',
    'Huele al fondo de las cosas.',
    'Alguien dejó comida para las aves. Al menos alguien planeó algo.',
    'Los gusanos siguen moviéndose. Las vidas pequeñas son tercas.',
    'Me pregunto si saben que son cebo.',
  ],
  normalGrabLines: [
    'No. No necesito otra cosa en las manos ahora mismo.',
    'A duras penas puedo cargar conmigo. La cubeta puede quedarse ahí.',
    'Está mojada, pesada y es honesta. Más de lo que puedo decir de mí.',
    'Mis bolsillos no están hechos para cebo ni confesiones.',
    'Tocarla haría que todo esto pareciera demasiado real.',
  ],
  droppedLookLines: [
    'La cubeta está abierta. Todo se derrama al final.',
    'Los gusanos encontraron la luz y probablemente se arrepienten.',
    'Ese desastre se parece a mis pensamientos cuando dejo de moverme.',
    'El muelle tiene otra cosa que puede echarme en cara.',
    'Hasta el cebo acabó donde la gravedad quería.',
  ],
  droppedGrabLines: [
    'No. Algunas cosas no se pueden volver a guardar bien.',
    'Ya terminé de fingir que un derrame se puede deshacer.',
    'Los gusanos pueden quedarse con su pequeño desastre.',
    'Mis manos ya están llenas de malas ideas.',
    'Si la recojo, solo volveré a tirarla.',
  ],
};

export const spanishFeedingText: RoccoTextCatalog['feeding'] = {
  turnAwayLine: 'No quiero mirar cómo desaparece algo.',
  lookLines: [
    'El pelícano come como si el mundo nunca hubiera terminado para él.',
    'Ese pico sabe exactamente lo que quiere. Lo envidio.',
    'No quiero mirar cómo desaparece algo.',
    'Los gusanos se van antes de entender el cielo.',
    'La naturaleza no es cruel. Solo dejó de discutir.',
    'La cubeta pertenece al pájaro ahora. A lo mejor yo nunca tuve nada tampoco.',
  ],
};

export const spanishKeysText: RoccoTextCatalog['keys'] = {
  lookLines: [
    'Llaves.',
    'No esperaba encontrar nada aquí.',
    'Esto cambia un poco las cosas.',
    'A lo mejor mi suerte está cambiando.',
    'No sé qué abren, pero pesan como una salida.',
  ],
  kickLines: [
    'No. No voy a patear la primera buena señal que he visto.',
    'Son pequeñas, pero no son poca cosa.',
    'Si las pierdo, sé perfectamente adónde se me irá la cabeza.',
    'No probemos dos veces la gravedad hoy.',
  ],
  collectedLines: [
    'Las tengo.',
    'Por primera vez en todo el día quiero alejarme del borde.',
    'Vale. Primero, ver qué abren.',
    'No me tiro hoy. No todavía.',
  ],
  defeatLines: [
    'Claro. Incluso una segunda oportunidad puede resbalarse.',
    'Vi caer la última cosa brillante y no hice nada bien.',
    'Mis manos recordaron cómo fallar.',
    'El mar sigue llevándose lo que casi conservo.',
    'La gravedad todavía sabe mi nombre.',
  ],
  defeatTitle: 'Has perdido',
};

export const spanishMiddleLevelText: RoccoTextCatalog['middleLevel'] = {
  pelikanFeedingLine: 'Mira, comida.',
};
