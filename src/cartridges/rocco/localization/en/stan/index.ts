import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { englishStanBooChoice } from './boo';
import { englishStanIntroduceSelfChoice } from './introduce-self';
import { englishStanShopOwnerChoice } from './shop-owner';
import { englishStanSleepingChoice } from './sleeping';

export const englishStanRootChoices: readonly RoccoDialogueChoiceNode[] = [
  englishStanIntroduceSelfChoice,
  englishStanShopOwnerChoice,
  englishStanSleepingChoice,
  englishStanBooChoice,
];
