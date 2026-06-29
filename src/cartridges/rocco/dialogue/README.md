# Rocco Dialogue Library

This directory contains reusable cartridge-side dialogue helpers for the `rocco-default` cartridge.

## Files

- `choice-menu.ts` - Dialogue choice menu projection on top of the console `engine.video.gridMenus` SDK.
- `runtime.ts` - `RoccoDialogueSession`, a reusable turn-based dialogue runtime for cartridges.
- `types.ts` - Dialogue line and nested choice node types.
- `index.ts` - Barrel export.

## Purpose

Dialogue remains cartridge-owned. The engine only exposes generic UI and message SDK primitives. This library turns those primitives into a reusable adventure-game conversation flow that cartridges can share across NPCs without moving game rules into the console.

`RoccoDialogueSession` owns the common turn structure:

1. Four-choice text menu.
2. Player line.
3. NPC reply.
4. Next choice menu or conversation end.

Nested `RoccoDialogueChoiceNode` trees let cartridges build longer branches with the same pattern. Each node carries:

- `playerLine` - what Rocco says when the choice is selected.
- `npcLine` - the reply after that line.
- `choices` - the next menu, when the conversation continues.

`RoccoDialogueLine` can be either a single string or multiple lines. Multi-line replies stay active for one message TTL per line.

## Menu Projection

`createRoccoDialogueChoiceMenu(...)` builds a one-column text list:

- Each choice becomes a generic grid-menu item with a text label.
- The panel uses the grid-menu `text-list` layout.
- Activations resolve back to cartridge dialogue choice ids.

## Runtime Usage

Create a session once per NPC controller:

```typescript
const dialogue = new RoccoDialogueSession({
  id: 'stan-dialogue',
  engine,
  playerSpriteInstanceId: 'rocco',
  npcSpriteInstanceId: 'stan',
});
```

Start a conversation from cartridge logic:

```typescript
dialogue.beginConversation({
  choices: stanRootChoices,
});
```

If a cartridge really needs an opening NPC line before the first menu, pass `npcLine` as an optional prelude.

Forward generic grid-menu activations back into the session:

```typescript
if (dialogue.handleGridMenu(activation)) {
  engine.video.render(0);
}
```

Advance the runtime from the owning controller `update()`:

```typescript
dialogue.update(deltaMs);
```

If the console dismisses the visible choice menu but the conversation is still waiting for a reply, cartridges can reopen the pending choices:

```typescript
dialogue.reopenChoices();
```

## Hooks

`RoccoDialogueSession` supports lightweight cartridge hooks around NPC replies:

- `beforeNpcReply(choice)` - start pre-reply staging when the player line begins and return the total staging time in milliseconds.
- `afterNpcLine(choice)` - react after the reply finishes.

Stan uses `beforeNpcReply(...)` to wake up or play his look-around animation while Rocco is speaking.
