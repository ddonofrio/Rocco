import type { RoccoTextCatalog } from './types';

export const roccoEnglishText: RoccoTextCatalog = {
  manifest: {
    title: 'ROCCO',
    description: 'A 90s-style adventure',
    author: 'Rocco Studio',
    publisher: "Diego D'Onofrio",
    genre: 'Adventure',
    players: '1',
    tags: ['builtin', 'default', 'demo', 'rocco'],
  },
  actions: {
    look: 'Look',
    grab: 'Grab',
    kick: 'Kick',
    talk: 'Talk',
    inventory: 'Inventory',
  },
  descriptions: {
    rocco: 'Rocco',
    baitBucket: 'Bait bucket',
    keys: 'Keys',
    pelikan: 'Pelikan',
  },
  levels: {
    beginning: 'Pier Beginning',
    middle: 'Pier Middle',
    end: 'Pier End',
    statusCartridge: 'Cartridge',
    statusLevel: 'Level',
    statusScene: 'Scene',
  },
  baitBucket: {
    normalLookLines: [
      'A bucket of bait. Something still wants to be alive in there.',
      'It smells like the bottom of things.',
      'The worms keep moving. Small lives are stubborn.',
      'I wonder if they know they are bait.',
    ],
    normalGrabLines: [
      'No. I do not need another thing in my hands right now.',
      'I can barely carry myself. The bucket can stay there.',
      'It is wet, heavy, and honest. More than I can say for me.',
      'Touching it would make this feel too real.',
    ],
    droppedLookLines: [
      'The bucket is open now. Everything spills eventually.',
      'The worms found daylight and probably regret it.',
      'That mess looks like my thoughts when I stop moving.',
      'Even the bait ended up where gravity wanted it.',
    ],
    droppedGrabLines: [
      'No. Some things cannot be put back neatly.',
      'I am done pretending a spill can be undone.',
      'My hands are already full of bad ideas.',
      'If I pick it up, I will only drop it again.',
    ],
  },
  feeding: {
    turnAwayLine: 'I do not want to watch something disappear.',
    lookLines: [
      'The Pelikan eats like the world never ended for it.',
      'That beak knows exactly what it wants. I envy that.',
      'I do not want to watch something disappear.',
      'Nature is not cruel. It is just finished arguing.',
      'That bird has no doubt in it at all.',
    ],
  },
  keys: {
    lookLines: [
      'Keys.',
      'I did not expect to find anything here.',
      'This changes things a little.',
      'Maybe my luck is changing.',
      'I do not know what they open, but they feel like a way out.',
    ],
    kickLines: [
      'No. I am not kicking away the first good sign I have seen.',
      'They are small, but they are not nothing.',
      'Let us not test gravity twice today.',
    ],
    collectedLines: [
      'I have them.',
      'For the first time all day, I want to step away from the edge.',
      'All right. First, find what they open.',
      'I am not jumping today. Not yet.',
    ],
    defeatLines: [
      'Of course. Even a second chance can slip.',
      'I watched the last bright thing fall and did nothing right.',
      'My hands remembered how to fail.',
      'Gravity still knows my name.',
    ],
    defeatTitle: 'You lose',
  },
  inventory: {
    title: 'Inventory',
    keysLabel: 'Keys',
    twentyEurosLabel: '€20',
    cannotUseItemLines: [
      'I cannot use that there.',
      'That does not fit. Not even in the sad way.',
    ],
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
  },
  rocco: {
    introThoughtLine: 'I think nothing is left for me, and it is deep enough here.',
    introHelpLine: 'Maybe you can help me.',
    selfTalkLines: [
      'I came here because the water looked final. Now I am stalling.',
      'If I keep talking, maybe I do not have to decide yet.',
      'The edge is still there. So am I, annoyingly.',
      'I should not be alone with this much silence.',
      'One more minute. That is all I can promise.',
      'The keys in my pocket make the water feel a little farther away.',
      'Maybe I can postpone the end until I see what opens.',
      'I am still scared, but scared is not the same as finished.',
    ],
  },
  pelikan: {
    lookLines: [
      'It stands like a priest of bad weather.',
      'That beak could split a secret in half.',
      'It looks at me like it knows why I came.',
      'The bird is ugly in a way that survived everything.',
    ],
    kickLines: [
      'No. I am not starting a fight I secretly want to lose.',
      'If I get closer, it will hurt me in a very literal way.',
      'Survival is still an option. Barely.',
    ],
    grabLines: [
      'No touching the bird. I have enough bad endings queued.',
      'Touching it feels like choosing pain for no reason.',
      'I need these fingers for whatever comes after this minute.',
    ],
    talkLines: [
      'You look like you have never apologized to anyone.',
      'I am not delicious. I am just tired.',
      'If you know a reason to turn around, now is the time.',
      'I come in peace and very little hope.',
    ],
  },
  middleLevel: {
    pelikanFeedingLine: 'Look, food.',
  },
};
