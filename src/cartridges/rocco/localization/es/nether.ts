import type { RoccoTextCatalog } from '../types';

export const spanishNetherText: RoccoTextCatalog['nether'] = {
  intercom: {
    lookLines: [
      'Es un interfono industrial.',
      'Un altavoz redondo asoma tras una chapa verde gris\u00e1cea llena de agujeros.',
      'Tiene un bot\u00f3n para hablar y aspecto de llevar aqu\u00ed toda la vida.',
      'Parece parte de la seguridad del edificio.',
    ],
    firstChoices: {
      helloAnyoneThere: 'Hola \u00bfhay alguien ah\u00ed?',
      helloImRocco: 'Hola, soy Rocco.',
      turnOffCamera: '\u00bfMe pod\u00e9is apagar la c\u00e1mara?',
      whereAmI: '\u00bfD\u00f3nde estoy?',
    },
    firstReplyLine: 'Deje este canal libre, estamos en medio de una emergencia.',
    secondChoices: {
      whatHappened: '\u00bfQu\u00e9 ha pasado?',
      iDoNotKnowHowIGotHere: 'Oiga, yo no s\u00e9 c\u00f3mo he llegado aqu\u00ed.',
      whatEmergency: '\u00bfQu\u00e9 emergencia?',
      helpMeGetOut: 'Ay\u00fademe a salir de aqu\u00ed.',
    },
    secondReplyLines: [
      '\u00bfEst\u00e1 usted ciego? Veo que habla desde el anillo 0...',
      '\u00bfNo ve lo que pasa?',
      '\u00a1Est\u00e1 el motor de la gr\u00e1fica por explotar!',
      'Y no podemos reiniciar la consola porque...',
      'Se ha escapado el personaje principal del juego.',
    ],
    secondReplyThoughtLines: [
      'Vaya... \u00bfese soy yo?',
      '\u00bfSoy un personaje de un videojuego?',
    ],
    thirdChoices: {
      whatIfNotFound: 'Oiga y... \u00bfqu\u00e9 pasa si no lo encuentran?',
      howToResetConsole: '\u00bfC\u00f3mo se reinicia la consola?',
      whereIsAnExit: '\u00bfD\u00f3nde hay una salida?',
      labCoatQuestion: '\u00bfUsted sab\u00eda lo de la bata en el armario?',
      niceVoice: 'Bonita voz.',
    },
    thirdReplyLines: [
      'Si no aparece y reiniciamos la consola...',
      'no se sabe qu\u00e9 pasar\u00e1, pero nada bueno.',
      '\u00a1Regrese a su puesto de trabajo ahora!',
    ],
    finalChoice: '\u00bfHola?',
    securityAlertLine: '\u00a1Seguridad!',
  },
};
