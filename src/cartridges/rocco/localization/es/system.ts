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
};

export const spanishDescriptionsText: RoccoTextCatalog['descriptions'] = {
  rocco: 'Rocco',
  baitBucket: 'Cubeta de cebo',
  baitShopDoor: 'Puerta de la tienda de cebo',
  backRightDoor: 'Puerta del fondo a la derecha',
  toilet: 'V\u00e1ter',
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
  micromania: 'Microman\u00eda',
  oldMan: 'Viejo',
  stan: 'Stan',
  pelikan: 'Pelícano',
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
  cycleSprite: 'Cambiar sprite',
  jumpLevelTitle: 'Saltar a nivel',
  jumpScreenTitle: 'Saltar a pantalla',
  pierLevelLabel: 'Muelle',
  inventoryTitle: 'Inventario de desarrollador',
  add: 'A\u00f1adir',
  remove: 'Quitar',
  clickToJumpStatus: 'Modo desarrollador: haz clic en cualquier parte para saltar.',
  clickToCycleSpriteStatus:
    'Modo desarrollador: haz clic en un sprite para cambiar su imagen. Haz clic fuera para salir.',
};
