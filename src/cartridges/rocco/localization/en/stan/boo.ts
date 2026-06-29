import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const englishStanBooChoice: RoccoDialogueChoiceNode = branch(
  'boo',
  'Booo',
  'Do not do that. If you are a ghost, take a number. What do you actually want?',
  [
    branch(
      'boo-bathroom',
      'I need to use a bathroom. Would you let me use yours?',
      'We are closed right now.',
      [
        leaf('boo-bathroom-where', 'Then where can I find one?', [
          'Across the street.',
          'Where the pier begins.',
        ]),
        leaf(
          'boo-bathroom-please',
          'Please, I really need to go.',
          'Mine is broken and there is a risk of death.',
        ),
        leaf('boo-bathroom-sea', 'Do you mind if I use the sea?', 'Not if I do not see your ass.'),
        leaf(
          'boo-bathroom-broken',
          'Since when is it broken?',
          'Since a tourist treated the pipe like a duel.',
        ),
      ],
    ),
    branch('boo-sorry', 'Sorry. Bad joke.', 'It was not a joke. It was syllabic vandalism.', [
      leaf(
        'boo-sorry-reflex',
        'At least your reflexes work.',
        'So does my ability to ban customers.',
      ),
      leaf(
        'boo-sorry-apology',
        'I am apologizing.',
        'Good. Keep climbing until you reach dignity.',
      ),
      leaf('boo-sorry-nervous', 'I get strange when I am nervous.', 'Then buy calm in bulk.'),
      leaf('boo-sorry-friends', 'We could start over as friends.', 'Let us not rush into fiction.'),
    ]),
    branch(
      'boo-testing',
      'I was testing your reflexes.',
      'Congratulations. I still dislike surprises.',
      [
        leaf('boo-testing-fast', 'You were quick.', 'Fear is lighter than coffee.'),
        leaf(
          'boo-testing-security',
          'Good security for a shop.',
          'My best defense is disappointment.',
        ),
        leaf(
          'boo-testing-robber',
          'What if I were a robber?',
          'Then I would point you to the register and let reality do the rest.',
        ),
        leaf(
          'boo-testing-science',
          'It was for science.',
          'Science deserves better funding and worse assistants.',
        ),
      ],
    ),
    branch('boo-lonely', 'You looked lonely.', 'I looked asleep. Learn the silhouettes.', [
      leaf('boo-lonely-mean', 'That sounded harsh.', 'That is because I polished it.'),
      leaf(
        'boo-lonely-company',
        'I was offering company.',
        'Company is easier to offer than endure.',
      ),
      leaf('boo-lonely-chair', 'The chair looked lonely too.', 'The chair understands boundaries.'),
      leaf(
        'boo-lonely-project',
        'I may have projected a little.',
        'Then project somewhere with tickets.',
      ),
    ]),
  ],
);
