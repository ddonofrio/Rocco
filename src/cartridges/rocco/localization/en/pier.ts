import type { RoccoTextCatalog } from '../types';

export const englishBaitBucketText: RoccoTextCatalog['baitBucket'] = {
  normalLookLines: [
    'A bucket of bait. Something still wants to be alive in there.',
    'It smells like the bottom of things.',
    'Someone left food for the birds. At least someone planned something.',
    'The worms keep moving. Small lives are stubborn.',
    'I wonder if they know they are bait.',
  ],
  normalGrabLines: [
    'No. I do not need another thing in my hands right now.',
    'I can barely carry myself. The bucket can stay there.',
    'It is wet, heavy, and honest. More than I can say for me.',
    'My pockets are not made for bait or confessions.',
    'Touching it would make this feel too real.',
  ],
  droppedLookLines: [
    'The bucket is open now. Everything spills eventually.',
    'The worms found daylight and probably regret it.',
    'That mess looks like my thoughts when I stop moving.',
    'The pier has one more thing it can hold against me.',
    'Even the bait ended up where gravity wanted it.',
  ],
  droppedGrabLines: [
    'No. Some things cannot be put back neatly.',
    'I am done pretending a spill can be undone.',
    'The worms can keep their little disaster.',
    'My hands are already full of bad ideas.',
    'If I pick it up, I will only drop it again.',
  ],
};

export const englishFeedingText: RoccoTextCatalog['feeding'] = {
  turnAwayLine: 'I do not want to watch something disappear.',
  lookLines: [
    'The Pelikan eats like the world never ended for it.',
    'That beak knows exactly what it wants. I envy that.',
    'I do not want to watch something disappear.',
    'The worms leave before they understand the sky.',
    'Nature is not cruel. It is just finished arguing.',
    'The bucket belongs to the bird now. Maybe I never had anything either.',
  ],
};

export const englishKeysText: RoccoTextCatalog['keys'] = {
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
    'If I lose them, I know exactly where my head will go.',
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
    'The sea keeps taking what I almost manage to keep.',
    'Gravity still knows my name.',
  ],
  defeatTitle: 'You lose',
};

export const englishMiddleLevelText: RoccoTextCatalog['middleLevel'] = {
  pelikanFeedingLine: 'Look, food.',
};

export const englishPierDoorText: RoccoTextCatalog['pierDoor'] = {
  lookWithKeyLines: [
    'There is a lock where one of these keys might fit.',
    'I think I could open it.',
    'I could use the keys from my inventory.',
  ],
  lookWithoutKeyLines: [
    'It is a closed door.',
    'It looks like the entrance to the shop.',
    'I wonder what they sell.',
  ],
  openWithKeyLines: [
    'I think I still have the keys in my pocket.',
    'I should try them from my inventory.',
  ],
  openWithoutKeyLines: [
    'It is not going to open by itself.',
    'I need a key first.',
  ],
  kickSleepingKnownStanLines: [
    'I am not going to wake Stan up.',
    'Better not wake Stan up for this.',
    'No. I am leaving Stan asleep.',
  ],
  kickSleepingUnknownStanLines: [
    'I am not going to wake the old man up.',
    'Better not wake the old man up for this.',
    'No. I am leaving the old man asleep.',
  ],
  kickAwakeLines: [
    'There is a policeman on the corner. I do not want to go to jail.',
    'With a policeman on the corner, kicking that door feels like a bad plan.',
    'No thanks. I would rather not get arrested today.',
  ],
};
