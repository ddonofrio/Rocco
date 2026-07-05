import type { RoccoTextCatalog } from '../types';

export const englishManifestText: RoccoTextCatalog['manifest'] = {
  title: 'ROCCO',
  description: 'A 90s-style adventure',
  author: 'Rocco Studio',
  publisher: "Diego D'Onofrio",
  genre: 'Adventure',
  players: '1',
  tags: ['builtin', 'default', 'demo', 'rocco'],
};

export const englishActionsText: RoccoTextCatalog['actions'] = {
  look: 'Look',
  grab: 'Grab',
  kick: 'Kick',
  talk: 'Talk',
  inventory: 'Inventory',
};

export const englishDescriptionsText: RoccoTextCatalog['descriptions'] = {
  rocco: 'Rocco',
  baitBucket: 'Bait bucket',
  baitShopDoor: 'Bait shop door',
  backRightDoor: 'Back right door',
  bathroom: 'Bathroom',
  toilet: 'Toilet',
  seatedRocco: 'Rocco in pure form',
  shellCitySign: 'Shell City sign',
  bench: 'Stool',
  postcardRack: 'Postcards',
  souvenirTable: 'Souvenir table',
  hiddenKeys: 'Hidden keys',
  cashRegister: 'Cash register',
  window: 'Window',
  barrel: 'Barrel',
  keys: 'Keys',
  magazine: 'Magazine',
  micromania: 'Micromania',
  pelikan: 'Pelikan',
  oldMan: 'Old man',
  stan: 'Stan',
};

export const englishLevelsText: RoccoTextCatalog['levels'] = {
  beginning: 'Pier Beginning',
  middle: 'Pier Middle',
  end: 'Pier End',
  statusCartridge: 'Cartridge',
  statusLevel: 'Level',
  statusScene: 'Scene',
  baitShopPlaceholderTitle: 'Bait Shop',
  baitShopToiletTitle: 'Bathroom',
  resetOfficeTitle: 'Reset Office',
};

export const englishDeveloperText: RoccoTextCatalog['developer'] = {
  actionLabel: 'Developer mode',
  title: 'Developer mode',
  jump: 'Jump',
  inventory: 'Inventory',
  cycleSprite: 'Cycle Sprite',
  jumpLevelTitle: 'Jump to level',
  jumpScreenTitle: 'Jump to screen',
  pierLevelLabel: 'Pier',
  inventoryTitle: 'Developer inventory',
  add: 'Add',
  remove: 'Remove',
  clickToJumpStatus: 'Developer mode: click anywhere to jump.',
  clickToCycleSpriteStatus:
    'Developer mode: click a sprite to cycle its image. Click outside to exit.',
};
