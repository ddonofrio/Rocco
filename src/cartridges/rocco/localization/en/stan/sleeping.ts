import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const englishStanSleepingChoice: RoccoDialogueChoiceNode = branch(
  'ask-sleeping',
  'Sorry, were you asleep?',
  'Dozing.',
  [
    branch('sleep-snore', 'You snore.', 'That was not snoring. That was sawing logs.', [
      leaf('sleep-snore-good', 'Sawing logs?', 'My snores sound like a saw.'),
      leaf('sleep-snore-loud', 'They were pretty loud.', 'Wisdom echoes.'),
      leaf(
        'sleep-snore-sorry',
        'Sorry for mentioning it.',
        'Then mention something flattering. I am awake now.',
      ),
      leaf(
        'sleep-snore-again',
        'Can you do it again?',
        'Pay me first. Live performances are premium.',
      ),
    ]),
    branch('sleep-bad-night', 'Long night?', 'Long decade. The night simply happened inside it.', [
      leaf('sleep-bad-night-coffee', 'Need coffee?', 'Need? Yes. Trust? No.'),
      leaf(
        'sleep-bad-night-home',
        'Do you ever rest at home?',
        'Home has chores. This chair has denial.',
      ),
      leaf(
        'sleep-bad-night-poetic',
        'You make exhaustion sound poetic.',
        'That is age. The body fails and the sentence improves.',
      ),
      leaf(
        'sleep-bad-night-same',
        'I am tired too.',
        'Excellent. We can disappoint the day as a team.',
      ),
    ]),
    branch('sleep-dreaming', 'Were you dreaming?', 'Only of invoices chasing me into the sea.', [
      leaf('sleep-dreaming-boats', 'Boat invoices?', 'The cruelest kind. Floating numbers.'),
      leaf(
        'sleep-dreaming-sea',
        'Why the sea?',
        'Because even my nightmares respect local geography.',
      ),
      leaf('sleep-dreaming-escape', 'Did you escape?', 'I woke up. That counts as a draw.'),
      leaf(
        'sleep-dreaming-better',
        'You should dream better things.',
        'You should begin with easier miracles.',
      ),
    ]),
    branch(
      'sleep-leave',
      'Do you want me to leave you alone?',
      'Want and need are luxury categories.',
      [
        leaf('sleep-leave-yes', 'So... yes?', 'So... not yet. I already paid the waking fee.'),
        leaf('sleep-leave-company', 'I can keep you company.', 'Can you keep it inexpensive?'),
        leaf(
          'sleep-leave-quiet',
          'I can stand here quietly.',
          'That sounds threatening in its own way.',
        ),
        leaf(
          'sleep-leave-honest',
          'I am not great company.',
          'Then we finally have common ground.',
        ),
      ],
    ),
  ],
);
