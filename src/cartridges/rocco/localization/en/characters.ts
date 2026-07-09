import type { RoccoTextCatalog } from '../types';
import { englishStanRootChoices } from './stan';

export const englishRoccoText: RoccoTextCatalog['rocco'] = {
  introThoughtLine: 'It is deep enough here...',
  introHelpLine: 'Maybe you can help me.',
  selfTalkLines: [
    "It's strange talking to myself.",
    'No one is looking at me, and I still feel watched.',
    'Breathe, Rocco. Worse ideas have gotten sequels.',
    "I'm not okay, but I'm talking. That's something.",
    "I'm Rocco.",
  ],
};

export const englishPelikanText: RoccoTextCatalog['pelikan'] = {
  lookLines: [
    'It stands like a priest of bad weather.',
    'That beak could split a secret in half.',
    'It looks at me like it knows why I came.',
    'The bird is ugly in a way that survived everything.',
  ],
  kickLines: [
    'No. I am not starting a fight I secretly want to lose.',
    'If I get closer, it will hurt me in a very literal way.',
    'That thing is older than my bravery.',
    'No. Even desperation has standards.',
  ],
  grabLines: [
    'No touching the bird. I have enough bad endings queued.',
    'Touching it feels like choosing pain for no reason.',
    'I need these fingers for whatever comes after this minute.',
    'I prefer my hands attached and my regrets abstract.',
  ],
  talkLines: [
    'You look like you have never apologized to anyone.',
    'I am not delicious. I am just tired.',
    'If you know a reason to turn around, now is the time.',
    'I come in peace and very little hope.',
  ],
};

export const englishStanText: RoccoTextCatalog['stan'] = {
  lookLines: [
    'An old man on a chair, asleep in broad daylight.',
    'He sleeps with the confidence of someone who has never fallen apart in public.',
    'That man is out cold. I envy the commitment.',
    'He looks like he belongs to this pier more than the wood does.',
  ],
  grabLines: [
    'He looks bigger than me.',
    'If I touch him, he is going to hurt me.',
    'No. I am not shaking awake a man who could flatten me.',
    'He has the size advantage and the age advantage somehow.',
  ],
  kickLines: [
    'He looks bigger than me.',
    'If I wake him up like that, he is going to hurt me.',
    'No chance. That is how I get thrown into the sea.',
    'I prefer my fear theoretical, thanks.',
  ],
  rootChoices: englishStanRootChoices,
};
