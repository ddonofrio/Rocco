import type { RoccoTextCatalog } from '../types';

export const spanishNetherText: RoccoTextCatalog['nether'] = {
  arrivalThoughtLine: '\u{BF}qu\u{E9} es este lugar?',
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
