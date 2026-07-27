import type { RoccoTextCatalog } from '../types';

export const spanishNetherText: RoccoTextCatalog['nether'] = {
  arrivalThoughtLine: '\u{BF}qu\u{E9} es este lugar?',
  printer: {
    description: 'Impresora',
    readLabel: 'Leer',
    grabLines: [
      'Parece algo muy pesado. Necesitar\u{ED}a una gr\u{FA}a para moverlo.',
      'Como intente coger eso, me quedo sin espalda.',
      'Eso no se coge as\u{ED} como as\u{ED}. Pesa una barbaridad.',
      'Estoy bastante seguro de que esa impresora pesa m\u{E1}s que yo.',
    ],
    kickLines: [
      'Como le d\u{E9} una patada, me rompo una pierna.',
      'Ni de broma; esa cosa me dejar\u{ED}a el pie hecho polvo.',
      'La impresora ganar\u{ED}a la pelea y mi pierna perder\u{ED}a.',
      'Ser\u{ED}a como patear una pared de hierro.',
    ],
    firstMessageText:
      '[OFICINA DEL RESET #01011]\nSprite[0] # Player \u{2192} puntero UNDEFINED.\nBucle activo detectado. Consumo de CPU por encima del umbral.\nSolicitado reinicio inmediato del servicio de hardware Sprite[0].',
    firstMessageContraryText:
      '[OFICINA DEL RESET #01011]\nSprite[0] # Player \u{2192} puntero DEFINED.\nBucle inactivo detectado. Consumo de CPU por debajo del umbral.\nNo solicitar reinicio del servicio de hardware Sprite[0].',
    secondMessageText:
      '[ALERTA GENERAL #01012]\nPosible salida de portal localizada en el pasillo de acceso\na la Oficina del Reset.\nExtreme la precauci\u{00F3}n. Solicite identificaci\u{00F3}n a toda entidad detectada.',
    secondMessageContraryText:
      '[ALERTA GENERAL #01012]\nNo se ha localizado ninguna salida de portal en el pasillo\nde acceso a la Oficina del Reset.\nNo es necesario extremar la precauci\u{00F3}n ni identificar a nadie.',
    thirdMessageText:
      '[OFICINA DEL RESET #01013]\nBuenas noticias: un reinicio completo de la consola\nreinsertar\u{00E1} al NPC fugado en el juego.\nAplicar RESET GENERAL inmediatamente.',
    thirdMessageContraryText:
      '[OFICINA DEL RESET #01013]\nMalas noticias: un apagado incompleto de la consola\nexpulsar\u{00E1} al NPC atrapado fuera del juego.\nNo aplicar RESET PARTICULAR nunca.',
    fourthMessageText: '[OFICINA DEL RESET #01014]\nURGENTE: RESETEAR LA CONSOLA\nAHORA MISMO.',
    fourthMessageContraryText:
      '[OFICINA DEL RESET #01014]\nNO ES URGENTE: NO RESETEAR LA CONSOLA\nAHORA MISMO.',
    messageTexts: [
      '[OFICINA DEL RESET #01011]\nSprite[0] # Player \u{2192} puntero UNDEFINED.\nBucle activo detectado. Consumo de CPU por encima del umbral.\nSolicitado reinicio inmediato del servicio de hardware Sprite[0].',
      '[ALERTA GENERAL #01012]\nPosible salida de portal localizada en el pasillo de acceso\na la Oficina del Reset.\nExtreme la precauci\u{00F3}n. Solicite identificaci\u{00F3}n a toda entidad detectada.',
      '[OFICINA DEL RESET #01013]\nBuenas noticias: un reinicio completo de la consola\nreinsertar\u{00E1} al NPC fugado en el juego.\nAplicar RESET GENERAL inmediatamente.',
      '[OFICINA DEL RESET #01014]\nURGENTE: RESETEAR LA CONSOLA\nAHORA MISMO.',
      '[OFICINA DEL RESET #01015]\nATENCI\u{00D3}N, GUYSPRITE: si se encuentra en peligro o en una situaci\u{00F3}n\ncomprometida, responda \u{AB}S\u{00CD}\u{BB}.\nEn caso contrario, reinicie la consola inmediatamente.',
      '[OFICINA DEL RESET #01016]\nEl subsistema de v\u{00ED}deo no responde. Renderizado detenido\nen el \u{00FA}ltimo fotograma.\nReiniciar VIDEO CORE inmediatamente.',
      '[OFICINA DEL RESET #01017]\nDesbordamiento detectado en la cola de audio. Reproducci\u{00F3}n\nbloqueada en bucle.\nReiniciar AUDIO SERVICE.',
      '[OFICINA DEL RESET #01018]\nEl m\u{00F3}dulo de entrada registra comandos inexistentes. Control\ndel jugador comprometido.\nReiniciar INPUT CONTROLLER.',
      '[OFICINA DEL RESET #01019]\nColisi\u{00F3}n persistente detectada fuera de los l\u{00ED}mites del mapa.\nReiniciar PHYSICS ENGINE.',
      '[OFICINA DEL RESET #01020]\nLa memoria de sprites contiene referencias obsoletas y punteros inv\u{00E1}lidos.\nVaciar cach\u{00E9} y reiniciar SPRITE MEMORY.',
      '[OFICINA DEL RESET #01021]\nEl reloj interno presenta una desviaci\u{00F3}n cr\u{00ED}tica. Eventos\nejecutados fuera de secuencia.\nReiniciar SYSTEM CLOCK.',
      '[OFICINA DEL RESET #01022]\nLa cola de procesos ha dejado de liberar tareas finalizadas.\nReiniciar PROCESS SCHEDULER.',
      '[OFICINA DEL RESET #01023]\nDatos corruptos detectados en el estado actual de la partida.\nDescartar sesi\u{00F3}n y reiniciar SAVE STATE SERVICE.',
      '[OFICINA DEL RESET #01024]\nEl generador de entidades contin\u{00FA}a creando NPC sin autorizaci\u{00F3}n.\nReiniciar ENTITY SPAWNER.',
      '[OFICINA DEL RESET #01025]\nFallo de sincronizaci\u{00F3}n entre m\u{00F3}dulos principales. Estado\nde consola inestable.\nEjecutar RESET DE BUS INTERNO.',
    ],
    messageContraryTexts: [
      '[OFICINA DEL RESET #01011]\nSprite[0] # Player \u{2192} puntero DEFINED.\nBucle inactivo detectado. Consumo de CPU por debajo del umbral.\nNo solicitar reinicio del servicio de hardware Sprite[0].',
      '[ALERTA GENERAL #01012]\nNo se ha localizado ninguna salida de portal en el pasillo\nde acceso a la Oficina del Reset.\nNo es necesario extremar la precauci\u{00F3}n ni identificar a nadie.',
      '[OFICINA DEL RESET #01013]\nMalas noticias: un apagado incompleto de la consola\nexpulsar\u{00E1} al NPC atrapado fuera del juego.\nNo aplicar RESET PARTICULAR nunca.',
      '[OFICINA DEL RESET #01014]\nNO ES URGENTE: NO RESETEAR LA CONSOLA\nAHORA MISMO.',
      '[OFICINA DEL RESET #01015]\nATENCI\u{00D3}N, GUYSPRITE: si se encuentra en peligro o en una situaci\u{00F3}n\ncomprometida, responda \u{AB}NO\u{BB}.\nEn caso contrario, no reinicie la consola.',
      '[OFICINA DEL RESET #01016]\nEl subsistema de v\u{00ED}deo responde. Renderizado activo en el\nfotograma actual.\nNo reiniciar VIDEO CORE.',
      '[OFICINA DEL RESET #01017]\nLa cola de audio no presenta desbordamiento. Reproducci\u{00F3}n\ndisponible y sin bloqueos.\nNo reiniciar AUDIO SERVICE.',
      '[OFICINA DEL RESET #01018]\nEl m\u{00F3}dulo de entrada registra comandos v\u{00E1}lidos. Control del\njugador operativo.\nNo reiniciar INPUT CONTROLLER.',
      '[OFICINA DEL RESET #01019]\nNo se detectan colisiones fuera de los l\u{00ED}mites del mapa.\nNo reiniciar PHYSICS ENGINE.',
      '[OFICINA DEL RESET #01020]\nLa memoria de sprites contiene referencias actuales y punteros\nv\u{00E1}lidos.\nNo vaciar cach\u{00E9} ni reiniciar SPRITE MEMORY.',
      '[OFICINA DEL RESET #01021]\nEl reloj interno est\u{00E1} sincronizado. Eventos ejecutados en\nla secuencia correcta.\nNo reiniciar SYSTEM CLOCK.',
      '[OFICINA DEL RESET #01022]\nLa cola de procesos libera todas las tareas finalizadas.\nNo reiniciar PROCESS SCHEDULER.',
      '[OFICINA DEL RESET #01023]\nDatos v\u{00E1}lidos detectados en el estado actual de la partida.\nConservar sesi\u{00F3}n y no reiniciar SAVE STATE SERVICE.',
      '[OFICINA DEL RESET #01024]\nEl generador de entidades no crea NPC sin autorizaci\u{00F3}n.\nNo reiniciar ENTITY SPAWNER.',
      '[OFICINA DEL RESET #01025]\nSincronizaci\u{00F3}n correcta entre m\u{00F3}dulos principales. Estado\nde consola estable.\nNo ejecutar RESET DE BUS INTERNO.',
    ],
    replyToGuyspriteLabel: 'Contestar a Guysprite',
    readMoreMessagesLabel: 'Leer m\u{E1}s mensajes',
    replyReadMessageLabel: 'Contestar lo que dice el mensaje',
    replyContraryLabel: 'Decir lo contrario al mensaje',
    replyUnreadableLabel: 'Decir que no se lee bien',
    replyUnreadableLines: [
      'No se entiende nada, la impresi\u{00F3}n ha salido fatal.',
      'El papel est\u{00E1} sucio y las letras casi ni se ven.',
      'La tinta est\u{00E1} corrida; no hay quien descifre esto.',
      'Esto se imprimi\u{00F3} con poca tinta... parecen manchas.',
    ],
  },
  securityCameraBribe: {
    thanksLine: '\u{A1}Gracias!',
    securityLine: '\u{A1}Seguridad!',
    roccoReactionLine: '\u{BF}En serio?',
  },
  intercom: {
    lookLines: [
      'Es un interfono industrial.',
      'Un altavoz redondo asoma tras una chapa verde gris\u{E1}cea llena de agujeros.',
      'Tiene un bot\u{F3}n para hablar y aspecto de llevar aqu\u{ED} toda la vida.',
      'Parece parte de la seguridad del edificio.',
    ],
    firstChoices: {
      helloAnyoneThere: 'Hola \u{BF}hay alguien ah\u{ED}?',
      helloImRocco: 'Hola, soy Rocco.',
      turnOffCamera: '\u{BF}Me pod\u{E9}is apagar la c\u{E1}mara?',
      whereAmI: '\u{BF}D\u{F3}nde estoy?',
    },
    firstReplyLine: 'Deje este canal libre, estamos en medio de una emergencia.',
    secondChoices: {
      whatHappened: '\u{BF}Qu\u{E9} ha pasado?',
      iDoNotKnowHowIGotHere: 'Oiga, yo no s\u{E9} c\u{F3}mo he llegado aqu\u{ED}.',
      whatEmergency: '\u{BF}Qu\u{E9} emergencia?',
      helpMeGetOut: 'Ay\u{FA}deme a salir de aqu\u{ED}.',
    },
    secondReplyLines: [
      '\u{BF}Est\u{E1} usted ciego? Veo que habla desde el anillo 0...',
      '\u{BF}No ve lo que pasa?',
      '\u{A1}Est\u{E1} el motor de la gr\u{E1}fica por explotar!',
      'Y no podemos reiniciar la consola porque...',
      'Se ha escapado el personaje principal del juego.',
    ],
    secondReplyThoughtLines: [
      'Vaya... \u{BF}ese soy yo?',
      '\u{BF}Soy un personaje de un videojuego?',
    ],
    thirdChoices: {
      whatIfNotFound: 'Oiga y... \u{BF}qu\u{E9} pasa si no lo encuentran?',
      howToResetConsole: '\u{BF}C\u{F3}mo se reinicia la consola?',
      whereIsAnExit: '\u{BF}D\u{F3}nde hay una salida?',
      labCoatQuestion: '\u{BF}Usted sab\u{ED}a lo de la bata en el armario?',
      niceVoice: 'Bonita voz.',
    },
    thirdReplyLines: [
      'Si no aparece y reiniciamos la consola...',
      'no se sabe qu\u{E9} pasar\u{E1}, pero nada bueno.',
      '\u{A1}Regrese a su puesto de trabajo ahora!',
    ],
    finalChoice: '\u{BF}Hola?',
    securityAlertLine: '\u{A1}Seguridad!',
  },
  timbre: {
    lookLines: ['Es un timbre dorado.'],
  },
  officeArrival: {
    caughtLine: '\u{00A1}Polic\u{00ED}a! \u{00A1}Encontr\u{00E9} a Rocco!',
    welcomeLine: '\u{00A1}Te esperaba como agua de mayo! Pasa.',
    dialogue: {
      firstChoices: [
        { label: 'Hola se\u{00F1}or, soy Rocco.', reply: 'Hola se\u{00F1}or...' },
        {
          label: 'Hola \u{00BF}me dir\u{00ED}a c\u{00F3}mo salir de aqu\u{00ED}?',
          reply: 'Hola \u{00BF}me...',
        },
        {
          label: 'Tu bata est\u{00E1} mucho m\u{00E1}s limpia que la m\u{00ED}a.',
          reply: 'Tu bata...',
        },
        { label: 'T\u{00FA} me recuerdas a alguien.', reply: 'T\u{00FA} me...' },
      ],
      firstGuyspriteLines: [
        'Ya s\u{00E9}, t\u{00FA} eres Rulo, el sobrino del due\u{00F1}o, te imaginaba m\u{00E1}s joven.',
        'Mi nombre es Guysprite, Guysprite Treepgood, soy el responsable de resetar el juego.',
        'Tu t\u{00ED}o me hab\u{00ED}a jugado una broma, me hab\u{00ED}a dicho que no llegar\u{00ED}as hasta la semana que viene.',
      ],
      secondChoices: [
        { label: 'Debe de haber un error, soy Rocco.', reply: 'Debe de...' },
        { label: 'As\u{00ED} es, al final me ha enviado antes.', reply: 'As\u{00ED} es...' },
        {
          label: '\u{00BF}C\u{00F3}mo de resetear la consola? \u{00BF}C\u{00F3}mo es eso?',
          reply: '\u{00BF}C\u{00F3}mo de...',
        },
      ],
      secondGuyspriteLines: [
        'Con la que est\u{00E1} cayendo, no sabes, est\u{00E1}n todos locos.',
        'Rocco, el personaje principal del juego, encontr\u{00F3} un glitch...',
        '...y se sali\u{00F3} del juego, y ahora est\u{00E1} pase\u{00E1}ndose por la consola...',
        '...y nadie sabe d\u{00F3}nde est\u{00E1}...',
        '\u{00BF}T\u{00FA} no lo has visto?',
      ],
      thirdChoices: [
        { label: 'Esto... pero si \u{00A1}soy yo!', reply: 'Esto... pero...' },
        { label: 'No, no lo he visto.', reply: 'No, no...' },
        {
          label: '\u{00BF}T\u{00FA}, no dejas hablar? \u{00BF}o qu\u{00E9}?',
          reply: '\u{00BF}T\u{00FA}, no...',
        },
        { label: 'Lo peor de todo es que hay gente as\u{00ED}.', reply: 'Lo peor...' },
      ],
      finalGuyspriteLines: [
        'Cuando habl\u{00E9} con tu t\u{00ED}o y me dijo que vendr\u{00ED}as de becario...',
        '...estaba plet\u{00F3}rico. Necesitamos a dos personas aqu\u{00ED} y me...',
        '...han dejado solo desde que montaron todo esto...',
        '...pero no sabes c\u{00F3}mo era antes, esta peque\u{00F1}a cocina la mont\u{00E9} yo mismo. \u{00BF}Te apetece un caf\u{00E9}?',
      ],
      systemBeepsLine: '[Pitidos de m\u{00E1}quina] Pi pi pi pi pi pi...',
      postCoffeeGuyspriteLines: [
        'Oh, parece que ya se reestablece el sistema...',
        '...me vienes genial, dejemos ese caf\u{00E9} para despu\u{00E9}s...',
        'Venga, vamos a la otra parte de la habitaci\u{00F3}n.',
      ],
      departureReminderLines: [
        'Venga, despu\u{00E9}s de ti, vamos a sentarnos a los mandos.',
        'Te sigo \u{00A1}vamos!',
        'Esto... t\u{00FA}... t\u{00FA} \u{00A1}eres Rocco! \u{00A1}SEGURIDAD!',
      ],
      guyspriteTalkLine: '\u{00A1}Date prisa!',
      guyspriteLookLines: [
        'Es tan verborr\u{00E1}gico como nervioso.',
        'Habla tanto como tiembla.',
        'Parece que las palabras le salen antes que los pensamientos.',
        'No para de hablar, ni siquiera cuando respira.',
        'Est\u{00E1} m\u{00E1}s nervioso que una cafetera a punto de explotar.',
      ],
    },
  },
  officeReading: {
    patienceLabel: 'Paciencia de Guysprite',
    startLine: 'Venga, Rulo, léeme el primer mensaje.',
    correctLine: 'Ok, eso haremos. Y luego ¿qué dice el siguiente mensaje?',
    resetCorrectLine: '\u{00A1}Genial! Reiniciemos la consola, entonces.',
    secondMessageSecurityLine: 'Ok, enséñame tu ID.',
    incorrectLines: ['Vaya, ¡qué mensaje más raro!', '¿Seguro que han dicho eso?'],
    nextLine: 'Léeme el siguiente mensaje.',
    repeatedLine: 'Espera, ese mensaje ya me lo habías leído ¿están repitiendo?',
    repeatedNextLine: 'Lee el siguiente mensaje.',
    firstMessageResetLine: 'Ok, lo reinicio.',
    firstMessageAlertLines: ['Pero si tú eres Rocco!', '¡Seguridad!'],
    zeroLines: ['Pero ¡quién eres tú! ¡Seguridad!', 'Un momento, tú no eres Rulo. ¡Seguridad!'],
  },
  doorHandle: {
    lookLines: ['Parece un mecanismo para abrir la puerta desde fuera.'],
  },
  ascendingPipes: {
    lookLines: [
      'Son tuber\u{ED}as que van del suelo al techo.',
      'Este lugar est\u{E1} lleno de estas.',
      'Son de metal gris y parecen robustas.',
      'Esta tiene una v\u{E1}lvula de volante en medio.',
    ],
  },
  wheelValve: {
    lookLines: [
      'Es la t\u{ED}pica rueda con cinco radios de metal.',
      'Un volante de v\u{E1}lvula, grande y pesado.',
      'Los radios est\u{E1}n algo oxidados pero firmes.',
    ],
    grabLines: ['Ni loco toco nada de aqu\u{ED}, esto est\u{E1} por explotar.'],
  },
};
