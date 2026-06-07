export const ROCCO_DEFAULT_LOCALE = 'en';
export const ROCCO_SUPPORTED_LOCALES = ['en', 'es'] as const;

export type RoccoLocale = (typeof ROCCO_SUPPORTED_LOCALES)[number];

export interface RoccoLocalizedManifestText {
  title?: string;
  description?: string;
  author?: string;
  publisher?: string;
  genre?: string;
  players?: string;
  tags?: string[];
}

export interface RoccoTextCatalog {
  manifest: RoccoLocalizedManifestText;
  actions: {
    look: string;
    grab: string;
    kick: string;
    talk: string;
    inventory: string;
  };
  descriptions: {
    rocco: string;
    baitBucket: string;
    keys: string;
    pelikan: string;
  };
  levels: {
    beginning: string;
    middle: string;
    end: string;
    statusCartridge: string;
    statusLevel: string;
    statusScene: string;
  };
  baitBucket: {
    normalLookLines: string[];
    normalGrabLines: string[];
    droppedLookLines: string[];
    droppedGrabLines: string[];
  };
  feeding: {
    turnAwayLine: string;
    lookLines: string[];
  };
  keys: {
    lookLines: string[];
    kickLines: string[];
    collectedLines: string[];
    defeatLines: string[];
    defeatTitle: string;
  };
  inventory: {
    title: string;
    keysLabel: string;
    twentyEurosLabel: string;
    cannotUseItemLines: string[];
    keysOnBaitBucketLines: string[];
    moneyOnBaitBucketLines: string[];
    keysOnPelikanLines: string[];
    moneyOnPelikanLines: string[];
  };
  rocco: {
    introThoughtLine: string;
    introHelpLine: string;
    selfTalkLines: string[];
  };
  pelikan: {
    lookLines: string[];
    kickLines: string[];
    grabLines: string[];
    talkLines: string[];
  };
  middleLevel: {
    pelikanFeedingLine: string;
  };
}

export interface RoccoLocalization {
  locale: RoccoLocale;
  text: RoccoTextCatalog;
}
