# Game

This directory contains shared game-level utilities used by the engine and cartridges.

## Files

- `verbs.ts` - `Verb` type, `VERBS` constant, `isVerb()` guard, and `executeVerb()` helper.

## Verb System

ROCCO uses classic point-and-click adventure verbs.

| Verb   | Meaning              |
| ------ | -------------------- |
| `look` | Examine an object    |
| `use`  | Use or interact      |
| `talk` | Talk to a character  |
| `take` | Pick something up    |

Verbs are shared utilities. Cartridges usually receive action-menu activations directly and only need verbs when building command-style interaction flows.
