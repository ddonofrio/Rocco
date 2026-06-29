import type { RoccoTextCatalog } from '../types';

export const spanishInventoryText: RoccoTextCatalog['inventory'] = {
  title: 'Inventario',
  keysLabel: 'Llaves',
  magazineLabel: 'Revista',
  micromaniaLabel: 'Microman\u00eda',
  mysteriousKeyLabel: 'Llave',
  magazineOnSelfLine: 'Me gustar\u00eda leerla, pero sentado.',
  twentyEurosLabel: '20€',
  cannotUseItemLines: [
    'No puedo usar eso ahí.',
    'Eso no encaja. Ni siquiera de la forma triste.',
    'No se puede usar aquí.',
  ],
  keysOnStanArrestLine: 'Policía, encontré al ladrón.',
  moneyOnStanAcceptedLines: [
    'Gracias. Me viene genial.',
    'Qué pena que no tenga memoria para acordarme mañana de esto.',
    'Caja de empleados.',
  ],
  moneyOnStanReplyLine: 'Creo que soy tonto.',
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
};
