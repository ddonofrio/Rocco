export type RoccoDialogueLine = string | readonly string[];

export interface RoccoDialogueChoiceNode {
  id: string;
  playerLine: RoccoDialogueLine;
  npcLine: RoccoDialogueLine;
  choices?: readonly RoccoDialogueChoiceNode[];
}
