import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const englishStanShopOwnerChoice: RoccoDialogueChoiceNode = branch(
  'ask-shop-owner',
  'Are you the owner of the shop?',
  'Yes, and so does the gun in my pocket.',
  [
    branch(
      'owner-what-sell',
      'What do you sell?',
      'Things that float, things that almost float, and confidence.',
      [
        leaf(
          'owner-what-sell-best',
          'What sells the most?',
          "Lately? Nothing. One of these days I'll close up and leave forever.",
        ),
        leaf(
          'owner-what-sell-cheap',
          'Tell me about Guybrush Threepwood?',
          'Curious guy. He bought a good boat from me.',
        ),
        leaf(
          'owner-what-sell-small',
          "Do you ever feel like we're being watched?",
          'No, my head is perfectly fine.',
        ),
        leaf('owner-what-sell-need', 'I may need a boat one day.', "I don't sell boats anymore."),
      ],
    ),
    branch('owner-why-closed', 'Then why is the shop closed?', "Because it's nap time.", [
      leaf(
        'owner-why-closed-afraid',
        'And you nap outside the shop?',
        "Inside it's unbearably hot.",
      ),
      leaf('owner-why-closed-when-open', 'And what time do you open?', 'At 4:00 PM.'),
      leaf('owner-why-closed-exception', 'Could you make an exception?', 'No.'),
      leaf(
        'owner-why-closed-business',
        'That cannot be good for business.',
        'Business and I are seeing other people.',
      ),
    ]),
    branch('owner-bad-business', 'Is business going badly?', 'Only in the parts involving money.', [
      leaf('owner-bad-business-tourists', 'No tourists?', 'They come. But fewer and fewer.'),
      leaf('owner-bad-business-boats', 'No one wants souvenirs?', 'Very few.'),
      leaf('owner-bad-business-keep', 'Then why keep the shop?', 'Stubbornness, stubbornness.'),
      leaf('owner-bad-business-sympathy', 'That sounds rough.', 'It is.'),
    ]),
    branch(
      'owner-help',
      'Could you help me with something?',
      'Depends. Are you paying in cash, gratitude, or weird energy?',
      [
        leaf('owner-help-energy', 'Mostly weird energy.', 'Then I can offer professional concern.'),
        leaf(
          'owner-help-gratitude',
          'Gratitude and good manners?',
          'Keep the manners. Trade the gratitude for coins.',
        ),
        leaf('owner-help-direction', 'I just need direction.', 'Do I look like a compass to you?'),
        leaf(
          'owner-help-survive',
          "I'm a bit lost here on the pier.",
          'Then avoid the gulls, they steal your things.',
        ),
      ],
    ),
  ],
);
