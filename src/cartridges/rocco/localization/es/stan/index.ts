import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { spanishStanBooChoice } from './boo';
import { spanishStanIntroduceSelfChoice } from './introduce-self';
import { spanishStanShopOwnerChoice } from './shop-owner';
import { spanishStanSleepingChoice } from './sleeping';

export const spanishStanRootChoices: readonly RoccoDialogueChoiceNode[] = [
  spanishStanIntroduceSelfChoice,
  spanishStanShopOwnerChoice,
  spanishStanSleepingChoice,
  spanishStanBooChoice,
];
