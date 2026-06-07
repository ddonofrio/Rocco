import type { RoccoTextCatalog } from './types';

export const roccoSpanishText: RoccoTextCatalog = {
  manifest: {
    title: 'ROCCO',
    description: 'Una aventura al estilo de los 90',
    author: 'Rocco Studio',
    publisher: "Diego D'Onofrio",
    genre: 'Aventura',
    players: '1',
    tags: ['integrado', 'predeterminado', 'demo', 'rocco'],
  },
  actions: {
    look: 'Mirar',
    grab: 'Coger',
    kick: 'Patear',
    talk: 'Hablar',
    inventory: 'Inventario',
  },
  descriptions: {
    rocco: 'Rocco',
    baitBucket: 'Cubeta de cebo',
    keys: 'Llaves',
    pelikan: 'Pelícano',
  },
  levels: {
    beginning: 'Comienzo del muelle',
    middle: 'Medio del muelle',
    end: 'Final del muelle',
    statusCartridge: 'Cartucho',
    statusLevel: 'Nivel',
    statusScene: 'Escena',
  },
  baitBucket: {
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
  },
  feeding: {
    turnAwayLine: 'No quiero mirar cómo desaparece algo.',
    lookLines: [
      'El pelícano come como si el mundo nunca hubiera terminado para él.',
      'Ese pico sabe exactamente lo que quiere. Lo envidio.',
      'No quiero mirar cómo desaparece algo.',
      'Los gusanos se van antes de entender el cielo.',
      'La naturaleza no es cruel. Solo dejó de discutir.',
      'La cubeta pertenece al pájaro ahora. A lo mejor yo nunca tuve nada tampoco.',
    ],
  },
  keys: {
    lookLines: [
      'Llaves.',
      'No esperaba encontrar nada aquí.',
      'Esto cambia un poco las cosas.',
      'A lo mejor mi suerte está cambiando.',
      'No sé qué abren, pero pesan como una salida.',
    ],
    kickLines: [
      'No. No voy a patear la primera buena señal que he visto.',
      'Son pequeñas, pero no son nada.',
      'Si las pierdo, sé perfectamente adónde se me irá la cabeza.',
      'No probemos dos veces la gravedad hoy.',
    ],
    collectedLines: [
      'Las tengo.',
      'Por primera vez en todo el día quiero alejarme del borde.',
      'Vale. Primero ver qué abren.',
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
  },
  inventory: {
    title: 'Inventario',
    keysLabel: 'Llaves',
    twentyEurosLabel: '20€',
    cannotUseItemLines: [
      'No puedo usar eso ahí.',
      'Eso no encaja. Ni siquiera de la forma triste.',
    ],
    keysOnBaitBucketLines: [
      'La cubeta no está cerrada. Solo está arruinada.',
      'Las llaves no van a cerrar lo que se derramó de ahí.',
    ],
    moneyOnBaitBucketLines: [
      'Tirar dinero al agua de cebo sería demasiado simbólico, incluso para mí.',
      'No. Ese billete es la última prueba de que hoy estuve en otro sitio.',
    ],
    keysOnPelikanLines: [
      'No voy a entregarle una razón para vivir a un pájaro.',
      'El pelícano se tragaría las llaves y pondría cara de inocente.',
    ],
    moneyOnPelikanLines: [
      'No voy a pagarle al pelícano para que me deje en paz.',
      'Sobornar a un pájaro es un plan, pero no uno bueno.',
    ],
  },
  rocco: {
    introThoughtLine: 'Creo que ya nada me queda, y aquí está lo suficientemente hondo.',
    introHelpLine: 'Tal vez tú me puedas ayudar.',
    selfTalkLines: [
      'Vine aquí porque el agua parecía definitiva. Ahora estoy ganando tiempo.',
      'Si sigo hablando, quizá no tengo que decidir todavía.',
      'El borde sigue ahí. Yo también, por desgracia.',
      'No debería estar solo con tanto silencio.',
      'Un minuto más. Es todo lo que puedo prometer.',
      'Las llaves en mi bolsillo hacen que el agua parezca un poco más lejos.',
      'Quizá puedo aplazar el final hasta ver qué se abre.',
      'Sigo asustado, pero asustado no es lo mismo que terminado.',
    ],
  },
  pelikan: {
    lookLines: [
      'Se planta como un sacerdote del mal tiempo.',
      'Ese pico podría partir un secreto en dos.',
      'Me mira como si supiera por qué he venido.',
      'El pájaro es feo de una forma que ha sobrevivido a todo.',
    ],
    kickLines: [
      'No. No voy a empezar una pelea que en secreto quiero perder.',
      'Si me acerco, me hará daño de una forma muy literal.',
      'Esa cosa es más vieja que mi valentía.',
      'No. Incluso la desesperación tiene estándares.',
    ],
    grabLines: [
      'Nada de tocar al pájaro. Ya tengo bastantes malos finales en cola.',
      'Tocarlo suena a elegir dolor sin motivo.',
      'Necesito estos dedos para lo que venga después de este minuto.',
      'Prefiero mis manos pegadas y mis arrepentimientos abstractos.',
    ],
    talkLines: [
      'Tienes pinta de no haberte disculpado jamás con nadie.',
      'No estoy delicioso. Solo cansado.',
      'Si sabes una razón para darme la vuelta, ahora es el momento.',
      'Vengo en son de paz y con muy poca esperanza.',
    ],
  },
  middleLevel: {
    pelikanFeedingLine: 'Mira, comida.',
  },
};
