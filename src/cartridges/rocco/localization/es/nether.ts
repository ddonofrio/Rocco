import type { RoccoTextCatalog } from '../types';

export const spanishNetherText: RoccoTextCatalog['nether'] = {
  arrivalThoughtLine: '\u{BF}qu\u{E9} es este lugar?',
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
