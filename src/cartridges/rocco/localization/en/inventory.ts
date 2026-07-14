import type { RoccoTextCatalog } from '../types';

export const englishInventoryText: RoccoTextCatalog['inventory'] = {
  title: 'Inventory',
  dropButtonLabel: 'Drop',
  pickupLine: "I'll keep it.",
  fullLines: ['I do not have room in my pockets for anything else.'],
  keysLabel: 'Keys',
  magazineLabel: 'Magazine',
  micromaniaLabel: 'Micromania',
  mysteriousKeyLabel: 'Key',
  twentyEurosLabel: '\u20ac20',
  bataLabel: 'Lab coat',
  floatingAmuletLabel: 'Floating Amulet',
  spiralRazorLabel: 'Turritella Razor',
  abyssalTalismanLabel: 'Abyssal Talisman',
  coralRelicLabel: 'Coral Relic',
  magazineOnSelfLine: 'I would like to read it, but sitting down.',
  bataOnSelfLine: 'I put it on.',
  bataAlreadyOnSelfLine: 'I am already wearing it.',
  cannotUseItemLines: [
    'I cannot use that there.',
    'That does not fit. Not even in the sad way.',
    'That cannot be used here.',
  ],
  keysOnStanArrestLine: 'Police, I found the thief.',
  moneyOnStanSleepingLines: ['Naah, he is sleeping.'],
  keysOnStanSleepingLines: ['Naah, he is sleeping.'],
  moneyOnStanAcceptedLines: [
    'Thanks, this comes in handy.',
    'Shame I do not have the memory to remember this tomorrow.',
    'Employee cash box.',
  ],
  moneyOnStanReplyLine: 'I think I am an idiot.',
  keysOnBaitBucketLines: [
    'The bucket is not locked. It is just ruined.',
    'Keys will not close what spilled out of that.',
  ],
  moneyOnBaitBucketLines: [
    'Throwing money at bait water feels too symbolic, even for me.',
    'No. That bill is the last proof I was somewhere else today.',
  ],
  keysOnPelikanLines: [
    'I am not handing a reason to live to a bird.',
    'The Pelikan would swallow the keys and look innocent.',
  ],
  moneyOnPelikanLines: [
    'I am not paying the Pelikan to leave me alone.',
    'Bribing a bird is a plan, but not a good one.',
  ],
};
