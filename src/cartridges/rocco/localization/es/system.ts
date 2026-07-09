import type { RoccoTextCatalog } from '../types';

export const spanishManifestText: RoccoTextCatalog['manifest'] = {
  title: 'ROCCO',
  description: 'Una aventura al estilo de los años 90',
  author: 'Rocco Studio',
  publisher: "Diego D'Onofrio",
  genre: 'Aventura',
  players: '1',
  tags: ['integrado', 'predeterminado', 'demo', 'rocco'],
};

export const spanishActionsText: RoccoTextCatalog['actions'] = {
  look: 'Mirar',
  grab: 'Coger',
  kick: 'Patear',
  talk: 'Hablar',
  inventory: 'Inventario',
  see: 'Ver',
  press: 'Presionar',
};

export const spanishDescriptionsText: RoccoTextCatalog['descriptions'] = {
  rocco: 'Rocco',
  baitBucket: 'Cubeta de cebo',
  baitShopDoor: 'Puerta de la tienda de cebo',
  backRightDoor: 'Puerta del fondo a la derecha',
  toilet: 'Váter',
  bathroom: 'Baño',
  seatedRocco: 'Rocco en estado puro',
  shellCitySign: 'Cartel de Shell City',
  bench: 'Taburete',
  postcardRack: 'Postales',
  souvenirTable: 'Mesa de souvenirs',
  hiddenKeys: 'Llave escondida',
  cashRegister: 'Caja registradora',
  window: 'Ventana',
  barrel: 'Barril',
  keys: 'Llaves',
  magazine: 'Revista',
  micromania: 'Micromanía',
  oldMan: 'Viejo',
  stan: 'Stan',
  pelikan: 'Pel\u00edcano',
  intercomunicador: 'Intercomunicador',
  noisyMachine: 'M\u00e1quina tremendamente ruidosa',
  shelf: 'Estanter\u00eda vac\u00eda',
  timbre: 'Timbre',
  doorHandle: 'Manija de la puerta',
  ascendingPipes: 'Tuber\u00edas ascendentes',
  wheelValve: 'V\u00e1lvula de volante',
};

export const spanishLevelsText: RoccoTextCatalog['levels'] = {
  beginning: 'Comienzo del muelle',
  middle: 'Medio del muelle',
  end: 'Final del muelle',
  statusCartridge: 'Cartucho',
  statusLevel: 'Nivel',
  statusScene: 'Escena',
  baitShopPlaceholderTitle: 'Tienda de cebo',
  baitShopToiletTitle: 'Baño',
  resetOfficeTitle: 'Oficina del reset',
};

export const spanishDeveloperText: RoccoTextCatalog['developer'] = {
  actionLabel: 'Modo desarrollador',
  title: 'Modo desarrollador',
  jump: 'Saltar',
  inventory: 'Inventario',
  events: 'Alterar eventos',
  cycleSprite: 'Cambiar sprite',
  jumpLevelTitle: 'Saltar a nivel',
  jumpScreenTitle: 'Saltar a pantalla',
  eventLevelTitle: 'Elegir nivel',
  eventScreenTitle: 'Elegir pantalla',
  eventTitle: 'Elegir evento',
  pierLevelLabel: 'Muelle',
  inventoryTitle: 'Inventario de desarrollador',
  add: 'Añadir',
  remove: 'Quitar',
  on: 'ON',
  off: 'OFF',
  allowToiletReuseEvent: 'Permitir usar váter más de una vez',
  clickToJumpStatus: 'Modo desarrollador: haz clic en cualquier parte para saltar.',
  clickToCycleSpriteStatus:
    'Modo desarrollador: haz clic en un sprite para cambiar su imagen. Haz clic fuera para salir.',
};
