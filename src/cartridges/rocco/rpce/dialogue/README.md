# Rocco Dialogue Runtime

This directory contains the canonical cartridge-owned dialogue and reusable message runtime for Rocco.

The console supplies generic grid-menu, sprite-message, and input-policy primitives. This runtime combines those primitives into conversation flow, linear speech sequences, non-repeating line selection, and cartridge-level message helpers.

## Files

- `choice-menu.ts` — projects dialogue choices into a one-column `text-list` grid menu and resolves matching activation events.
- `runtime.ts` — `RoccoDialogueSession`, nested conversation flow, timed pages, linear sequences, advancement, cancellation, choice reopening, and dialogue-owned input leases.
- `types.ts` — `RoccoDialogueLine` and nested `RoccoDialogueChoiceNode`.
- `message-runtime.ts` — `RoccoCartridgeMessageRuntime`, shared `showMessage`, `say`, `think`, and history-based line selection.
- `line-selection.ts` — reusable non-repeating line selection with explicit state and optional immediate-repeat avoidance.
- `index.ts` — public exports.

## Ownership

Dialogue remains cartridge-owned.

The console owns:

- generic sprite messages;
- generic grid-menu presentation;
- generic carried UI state;
- input-policy lease infrastructure;
- frame updates.

The Rocco dialogue runtime owns:

- conversation phase;
- current choices;
- nested dialogue nodes;
- player and NPC timing;
- bridge delays;
- linear sequences;
- choice-menu identity;
- advance-only lease lifetime;
- cancellation;
- line-selection history.

## Choice model

```ts
type RoccoDialogueLine = string | readonly string[];

interface RoccoDialogueChoiceNode {
  id: string;
  playerLine: RoccoDialogueLine;
  npcLine: RoccoDialogueLine;
  choices?: readonly RoccoDialogueChoiceNode[];
}
```

A node contains the player line, the NPC reply, and optional nested choices.

## Conversation flow

`RoccoDialogueSession` runs a conversation in this order:

1. `beginConversation()` cancels any current session and stores the supplied root choices.
2. When an opening `npcLine` exists, the runtime shows that prelude before opening the first menu. Without a prelude, it opens the choices immediately.
3. `openChoices()` enters `awaiting-choice`, projects the choices into a one-column text-list grid menu, and releases the advance-only input lease.
4. `handleGridMenu()` accepts an `activate` event for this session's menu, resolves the selected choice, and starts the player turn.
5. The runtime calls `beforeNpcReply(choice)`, shows the player line, waits for all player-line pages, and applies any remaining bridge delay returned by the hook.
6. The runtime shows the NPC reply, waits for all NPC pages, and then calls `afterNpcLine(choice)`.
7. When the node contains nested choices, the next menu opens. Otherwise the conversation returns to `idle`.

`update(deltaMs)` advances pending timed steps.

`advance()` immediately completes the current timed player, bridge, NPC, or linear-sequence step.

`cancel()` clears pending steps, choices, linear sequence state, the session menu, and the session-owned input lease.

`reopenChoices()` restores the current choice menu when the conversation is still awaiting a choice but the menu was dismissed externally.

## Input policy

The session owns one input-policy lease with owner id `dialogue:<session-id>`.

The runtime acquires `advance-only` while the phase is:

- `waiting-player`;
- `waiting-bridge`;
- `waiting-npc`.

It releases the lease while the phase is:

- `awaiting-choice`;
- `idle`.

The session disposes only its own lease.

## Hooks

```ts
interface RoccoDialogueSessionHooks {
  beforeNpcReply?: (
    choice: RoccoDialogueChoiceNode,
  ) => number | void;

  afterNpcLine?: (
    choice: RoccoDialogueChoiceNode,
  ) => void;
}
```

`beforeNpcReply(choice)` runs when the player turn begins. Its optional numeric result is the total pre-reply staging duration. When staging lasts longer than the player line, the runtime waits the remaining difference in `waiting-bridge`.

`afterNpcLine(choice)` runs after the complete NPC reply finishes and before nested choices open or the conversation ends.

## Linear sequences and pages

A `RoccoDialogueLine` may be one string or an array of strings.

For conversation lines, an array is passed to the message subsystem as ordered pages. The dialogue runtime reserves one configured TTL interval per page.

`beginLinearSequence()` runs an ordered sequence without a choice menu.

A linear sequence defines:

- `speaker`: `player` or `npc`;
- `lines`;
- optional per-line TTL;
- message kind: `say` or `think`;
- optional message options;
- optional completion callback.

Input remains `advance-only` while a linear line is active. `advance()` skips the current line. Completion returns the session to `idle` and invokes the optional callback.

## Choice-menu projection

`createRoccoDialogueChoiceMenu()` creates a non-reorderable one-column grid menu using the `text-list` layout.

Each choice id becomes the grid item id.

`resolveRoccoDialogueChoice()` accepts only:

- the matching menu definition id;
- an `activate` interaction;
- a defined item id.

## Shared message runtime

`RoccoCartridgeMessageRuntime` wraps the cartridge-facing sprite-message API.

It provides:

- `showMessage`;
- `say`;
- `think`;
- `selectLines`.

Optional line selection supports:

- requested count;
- explicit history key;
- optional random function;
- immediate-repeat avoidance.

Selection state is maintained per history key.

`selectNonRepeatingLines()` is also exported independently for callers that need explicit selection state.

## Runtime dependency

The official Rocco runtime constructs dialogue sessions with `CartridgeSdkV1Runtime`.

Despite the option property currently being named `engine`, it contains the required SDK v1 facade, not `RoccoEngine` and not direct console-kernel access.
