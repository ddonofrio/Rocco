import type { RoccoDialogueChoiceNode } from '../rpce/dialogue';

export const ROCCO_DEFAULT_LOCALE = 'es';
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
    see: string;
    press: string;
  };
  descriptions: {
    rocco: string;
    baitBucket: string;
    baitShopDoor: string;
    backRightDoor: string;
    bathroom: string;
    toilet: string;
    seatedRocco: string;
    shellCitySign: string;
    bench: string;
    postcardRack: string;
    souvenirTable: string;
    hiddenKeys: string;
    cashRegister: string;
    window: string;
    barrel: string;
    keys: string;
    magazine: string;
    micromania: string;
    pelikan: string;
    oldMan: string;
    stan: string;
    intercomunicador: string;
    noisyMachine: string;
    shelf: string;
    timbre: string;
    doorHandle: string;
    ascendingPipes: string;
    wheelValve: string;
    shopExitDoorDescription: string;
  };
  levels: {
    beginning: string;
    middle: string;
    end: string;
    statusCartridge: string;
    statusLevel: string;
    statusScene: string;
    baitShopPlaceholderTitle: string;
    baitShopToiletTitle: string;
    resetOfficeTitle: string;
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
    dropButtonLabel: string;
    pickupLine: string;
    fullLines: string[];
    keysLabel: string;
    magazineLabel: string;
    micromaniaLabel: string;
    mysteriousKeyLabel: string;
    twentyEurosLabel: string;
    bataLabel: string;
    floatingAmuletLabel: string;
    spiralRazorLabel: string;
    abyssalTalismanLabel: string;
    coralRelicLabel: string;
    magazineOnSelfLine: string;
    bataOnSelfLine: string;
    bataAlreadyOnSelfLine: string;
    cannotUseItemLines: string[];
    keysOnStanArrestLine: string;
    moneyOnStanSleepingLines: string[];
    keysOnStanSleepingLines: string[];
    moneyOnStanAcceptedLines: string[];
    moneyOnStanReplyLine: string;
    keysOnBaitBucketLines: string[];
    moneyOnBaitBucketLines: string[];
    keysOnPelikanLines: string[];
    moneyOnPelikanLines: string[];
  };
  developer: {
    actionLabel: string;
    title: string;
    jump: string;
    inventory: string;
    events: string;
    cycleSprite: string;
    jumpLevelTitle: string;
    jumpScreenTitle: string;
    eventLevelTitle: string;
    eventScreenTitle: string;
    eventTitle: string;
    pierLevelLabel: string;
    inventoryTitle: string;
    add: string;
    remove: string;
    on: string;
    off: string;
    allowToiletReuseEvent: string;
    clickToJumpStatus: string;
    clickToCycleSpriteStatus: string;
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
  stan: {
    lookLines: string[];
    grabLines: string[];
    kickLines: string[];
    doorWakeThoughtLines: string[];
    rootChoices: readonly RoccoDialogueChoiceNode[];
  };
  middleLevel: {
    pelikanFeedingLine: string;
  };
  pierDoor: {
    lookWithKeyLines: string[];
    lookWithoutKeyLines: string[];
    openWithKeyLines: string[];
    openWithoutKeyLines: string[];
    kickSleepingKnownStanLines: string[];
    kickSleepingUnknownStanLines: string[];
    kickAwakeLines: string[];
  };
  baitShop: {
    magazineLookLine: string;
    toiletLookLines: string[];
    toiletReadLabel: string;
    toiletUseLabel: string;
    portalDescription: string;
    toiletStaySeatedLines: string[];
    toiletNeedMagazineLine: string;
    toiletUrgentLine: string;
    toiletMagazineReadingIntroLines: string[];
    toiletMagazineReadingMissingRelicLines: string[];
    toiletMagazineReadingCoralRelicLines: string[];
    toiletMagazineReadingCraftableRelicIntroLine: string;
    toiletMagazineReadingCraftStepLine: string;
    toiletMagazineReadingCraftableRelicOutroLine: string;
    toiletMagazineKnownStanLine: string;
    toiletMagazineUnknownStanLine: string;
    coralRelicStepLabel: string;
    coralRelicWishExistLine: string;
    coralRelicWishRootLine: string;
    coralRelicWishKnownStanDisappearLine: string;
    coralRelicWishUnknownStanDisappearLine: string;
    coralRelicWishEscapeLine: string;
    toiletPoliceAlertLine: string;
    toiletPostWishPoliceWarningLine: string;
    toiletPostWishReplyMomentPleaseLine: string;
    toiletPostWishReplyNoHitLine: string;
    toiletPostWishReplyWhatIfNotLine: string;
    toiletPostWishReplyComeInLine: string;
    toiletPostWishPoliceResponseLine: string;
    coralRelicLookLine: string;
    coralRelicRefuseLines: string[];
    toiletDoorOpenLabel: string;
    toiletDoorCloseLabel: string;
    toiletDoorWalkLabel: string;
    toiletDoorNeedsKeyLines: string[];
    toiletDoorOpenWithKeyLines: string[];
    toiletDoorWrongKeyLines: string[];
    toiletDoorLookLines: string[];
    toiletDoorLookWithKeyLines: string[];
    toiletDoorKickLine: string;
    shellCityLookLines: string[];
    shellCityKnownStanLine: string;
    shellCityUnknownStanLine: string;
    shopExitDoorLookLines: string[];
    shopExitDoorOpenLine: string;
    benchLookLines: string[];
    benchKnownStanWaitLine: string;
    benchUnknownStanWaitLine: string;
    benchJumpUpLine: string;
    benchGrabLines: string[];
    benchKnownStanStealLine: string;
    benchUnknownStanStealLine: string;
    postcardRackLookLines: string[];
    postcardRackRevealLine: string;
    postcardRackKickLines: string[];
    postcardRackGrabLines: string[];
    souvenirTableLookLines: string[];
    souvenirTableKnownStanLine: string;
    souvenirTableUnknownStanLine: string;
    souvenirTableKickLines: string[];
    hiddenKeysCollectedLine: string;
    cashRegisterLookLines: string[];
    cashRegisterKnownStanOldLine: string;
    cashRegisterUnknownStanOldLine: string;
    cashRegisterGrabLines: string[];
    cashRegisterKnownStanPocketLine: string;
    cashRegisterUnknownStanPocketLine: string;
    cashRegisterKickLines: string[];
    cashRegisterKnownStanWakeLine: string;
    cashRegisterUnknownStanWakeLine: string;
    windowLookLines: string[];
    windowKnownStanClosedLine: string;
    windowUnknownStanClosedLine: string;
    windowKnownStanCleaningLine: string;
    windowUnknownStanCleaningLine: string;
    leftBarrelLookLines: string[];
  };
  nether: {
    arrivalThoughtLine: string;
    intercom: {
      lookLines: string[];
      firstChoices: {
        helloAnyoneThere: string;
        helloImRocco: string;
        turnOffCamera: string;
        whereAmI: string;
      };
      firstReplyLine: string;
      secondChoices: {
        whatHappened: string;
        iDoNotKnowHowIGotHere: string;
        whatEmergency: string;
        helpMeGetOut: string;
      };
      secondReplyLines: string[];
      secondReplyThoughtLines: string[];
      thirdChoices: {
        whatIfNotFound: string;
        howToResetConsole: string;
        whereIsAnExit: string;
        labCoatQuestion: string;
        niceVoice: string;
      };
      thirdReplyLines: string[];
      finalChoice: string;
      securityAlertLine: string;
    };
    timbre: {
      lookLines: string[];
    };
    doorHandle: {
      lookLines: string[];
    };
    ascendingPipes: {
      lookLines: string[];
    };
    wheelValve: {
      lookLines: string[];
      grabLines: string[];
    };
  };
}

export interface RoccoLocalization {
  locale: RoccoLocale;
  text: RoccoTextCatalog;
}
