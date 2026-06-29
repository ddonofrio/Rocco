import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const englishStanIntroduceSelfChoice: RoccoDialogueChoiceNode = branch(
  'introduce-self',
  "Uhhh... excuse me sir, I'm Rocco",
  'I am Stan S. Stanman. What do you want?',
  [
    branch(
      'intro-nothing',
      'Nothing. I just do not really know what to do.',
      'Good. Confusion is cheaper than boats.',
      [
        leaf(
          'intro-nothing-direction',
          'Do you have a recommendation?',
          'Yes. Stop booing sleeping salesmen. Then improvise.',
        ),
        leaf(
          'intro-nothing-purpose',
          'I was aiming for purpose, not technique.',
          'Purpose is upstairs. We only stock flotation.',
        ),
        leaf(
          'intro-nothing-sea',
          'The sea does not look very instructive either.',
          'The sea teaches one lesson and it is extremely wet.',
        ),
        leaf(
          'intro-nothing-sorry',
          'Sorry. I am not at my sharpest.',
          'Then you arrived exactly as the pier expects.',
        ),
      ],
    ),
    branch(
      'intro-owner',
      'Are you the owner of this shop?',
      'Of this shop, yes. Of my life, absolutely not.',
      [
        leaf(
          'intro-owner-sell',
          'What does a closed shop like this sell exactly?',
          'In theory? Boats, parts, rope, and optimism by appointment.',
        ),
        leaf('intro-owner-open', 'So the shop is open?', "No. Closed closed, it's nap time."),
        leaf('intro-owner-alone', 'Do you work alone?', 'Yes, but I have a gun, just so you know.'),
        leaf(
          'intro-owner-buying',
          'If this place were open and someone bought something, would that wake you up?',
          'And... what if you were smart?',
        ),
      ],
    ),
    branch('intro-boats', 'Ah, did you use to sell boats?', 'Yes, but that was in another game.', [
      leaf(
        'intro-boats-same-stan',
        'The same Stan?',
        'The very same. Less hair, more warranty language.',
      ),
      leaf(
        'intro-boats-pirates',
        'Did pirates buy many?',
        'They browsed. Pirates love drama and hate invoices.',
      ),
      leaf('intro-boats-discount', 'Do returning fans get a discount?', 'Only on disappointment.'),
      leaf(
        'intro-boats-better-game',
        'Was that game better?',
        'It had better islands and worse boat insurance.',
      ),
    ]),
    branch('intro-sleeping', 'Sorry if I woke you up.', 'You did. I am a very light sleeper.', [
      leaf('intro-sleeping-rude', 'Was I rude?', 'It was amateur rude. I have seen professionals.'),
      leaf('intro-sleeping-late', 'Should I come back later?', 'If later brings coffee, yes.'),
      leaf(
        'intro-sleeping-tired',
        'You sound tired.',
        'That is the kindest possible spelling of old.',
      ),
      leaf('intro-sleeping-go', 'I can leave if you want.', "Yes, better. I'll keep sleeping."),
    ]),
  ],
);
