# Rocco Dialogue Runtime (RPCE)

This folder is the canonical cartridge-owned dialogue runtime. The console supplies generic messages, grid menus, and input leases; this folder owns conversation sequencing and authored-choice projection.

## Files

- `runtime.ts`: RoccoDialogueSession, conversation phases, linear sequences, advancing, cancellation, and input leases.
- `choice-menu.ts`: One-column text-list projection and activation-to-choice resolution.
- `types.ts`: RoccoDialogueLine and nested RoccoDialogueChoiceNode.
- `message-runtime.ts`: Cartridge message-line selection/runtime helpers.
- `line-selection.ts`: Non-repeating line selection state and helpers.
- `index.ts`: Public exports.

## Conversation Flow

Document this exact flow:

- beginConversation cancels prior state.
- An optional NPC prelude is displayed.
- Choices are stored and projected into a grid menu.
- A valid activation displays the player line.
- beforeNpcReply may introduce a bridge delay.
- The NPC reply is displayed.
- Nested choices reopen or the conversation returns to idle.
- Linear sequences and pages
- State that beginLinearSequence flattens every RoccoDialogueLine into individual pages. advance() removes the active page and completes only that pending step; the sequence finishes after the final page and then calls onComplete.

## Ownership and lifecycle

State that waiting player, bridge, and NPC phases hold an advance-only input lease. Awaiting-choice and idle phases release it. cancel() clears pending steps, choices, and linear state, returns to idle, and closes this session's open menu. reopenChoices() succeeds only while the session is actually awaiting a stored choice set.

## Hooks

Document beforeNpcReply(choice) and afterNpcLine(choice) exactly as exported.