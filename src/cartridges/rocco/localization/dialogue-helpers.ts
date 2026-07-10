import type { RoccoDialogueChoiceNode, RoccoDialogueLine } from '../rpce/dialogue';

export function dialogueLeaf(
  id: string,
  playerLine: RoccoDialogueLine,
  npcLine: RoccoDialogueLine,
): RoccoDialogueChoiceNode {
  return {
    id,
    playerLine,
    npcLine,
  };
}

export function dialogueBranch(
  id: string,
  playerLine: RoccoDialogueLine,
  npcLine: RoccoDialogueLine,
  choices: readonly RoccoDialogueChoiceNode[],
): RoccoDialogueChoiceNode {
  return {
    id,
    playerLine,
    npcLine,
    choices,
  };
}
