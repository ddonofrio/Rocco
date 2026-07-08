import { describe, expect, it } from 'vitest';

import { createRoccoDialogueChoiceMenu, resolveRoccoDialogueChoice } from '../../../../src/cartridges/rocco/dialogue/choice-menu';

describe('Rocco dialogue choice menu', () => {
  it('builds a text-list grid menu and resolves selected choices', () => {
    const menu = createRoccoDialogueChoiceMenu({
      id: 'stan-dialogue',
      choices: [
        { id: 'hello', text: 'Hello there.' },
        { id: 'question', text: 'Who are you?' },
      ],
    });

    expect(menu.gridMenu).toMatchObject({
      id: 'stan-dialogue',
      layout: 'text-list',
      columns: 1,
      rows: 2,
      closeOnActivate: true,
      items: [
        { id: 'hello', label: 'Hello there.', slotIndex: 0 },
        { id: 'question', label: 'Who are you?', slotIndex: 1 },
      ],
    });
    expect(
      resolveRoccoDialogueChoice(menu, {
        kind: 'grid-menu',
        definitionId: 'stan-dialogue',
        interaction: 'activate',
        itemId: 'question',
        items: [],
      }),
    ).toEqual({
      id: 'question',
      text: 'Who are you?',
    });
  });
});
