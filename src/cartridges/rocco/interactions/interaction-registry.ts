import type {
  InteractionContext,
  InteractionStage,
  InteractionDisposition,
  InteractionKind,
  InteractionRule,
  SpecialInventorySceneClickRule,
} from './interaction-types';
import {
  DuplicateInteractionRuleError,
  resolveInteractionKind,
} from './interaction-types';
import type { RoccoGridMenuCarriedItem } from '../../../console/video/grid-menu';
import type { RoccoInventoryRuntimeSceneClickResolution } from '../levels/runtime/rocco-inventory-runtime-controller';

export interface InteractionDispatchOutcome {
  readonly matched: boolean;
  readonly disposition: InteractionDisposition | void;
}

/**
 * Owns the distributed interaction rules for a cartridge session (audit
 * ROCCO-016 / DOM-002). Feature modules register their own rules; the central
 * router builds an {@link InteractionContext} and delegates to {@link dispatch}.
 *
 * Dispatch selects the first rule whose `matches()` returns true within the
 * action kind, ordered by descending priority. The rule's `execute()` result is
 * returned as-is, so a rule that returns `void` stops dispatch and reports the
 * action as not consumed (matching the prior router's early `return;` branches).
 */
export class InteractionRegistry {
  private readonly actionRules = new Map<string, InteractionRule>();
  private readonly specialRules = new Map<string, SpecialInventorySceneClickRule>();

  register(rule: InteractionRule): void {
    const existing = this.actionRules.get(rule.id);
    if (existing) {
      throw new DuplicateInteractionRuleError(rule.id, [existing.id, rule.id]);
    }
    this.actionRules.set(rule.id, rule);
  }

  registerSpecial(rule: SpecialInventorySceneClickRule): void {
    const existing = this.specialRules.get(rule.id);
    if (existing) {
      throw new DuplicateInteractionRuleError(rule.id, [existing.id, rule.id]);
    }
    this.specialRules.set(rule.id, rule);
  }

  registerMany(rules: readonly InteractionRule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  registerManySpecial(rules: readonly SpecialInventorySceneClickRule[]): void {
    for (const rule of rules) {
      this.registerSpecial(rule);
    }
  }

  getRules(): readonly InteractionRule[] {
    return [...this.actionRules.values()].sort(byDescendingPriority);
  }

  getSpecialRules(): readonly SpecialInventorySceneClickRule[] {
    return [...this.specialRules.values()].sort(byDescendingPriority);
  }

  dispatch(context: InteractionContext, signal: AbortSignal): InteractionDisposition | void {
    return this.dispatchDetailed(context, signal).disposition;
  }

  dispatchDetailed(
    context: InteractionContext,
    signal: AbortSignal,
    options: {
      kind?: InteractionKind;
      stage?: InteractionStage;
    } = {},
  ): InteractionDispatchOutcome {
    const kind = options.kind ?? resolveInteractionKind(context.action);
    const stage = options.stage ?? 'default';
    const candidates = this.rulesForKind(kind, stage);
    for (const rule of candidates) {
      if (!rule.matches(context)) {
        continue;
      }
      return {
        matched: true,
        disposition: rule.execute(context, signal),
      };
    }
    return {
      matched: false,
      disposition: undefined,
    };
  }

  dispatchSpecialInventorySceneClick(
    context: InteractionContext,
    carriedItem: RoccoGridMenuCarriedItem,
  ): RoccoInventoryRuntimeSceneClickResolution {
    const candidates = this.getSpecialRules();
    for (const rule of candidates) {
      if (!rule.matches(context, carriedItem)) {
        continue;
      }
      const result = rule.execute(context, carriedItem);
      if (result.handled) {
        return result;
      }
    }
    return { handled: false };
  }

  private rulesForKind(
    kind: InteractionKind,
    stage: InteractionStage,
  ): readonly InteractionRule[] {
    return [...this.actionRules.values()]
      .filter((rule) => rule.kind === kind && (rule.stage ?? 'default') === stage)
      .sort(byDescendingPriority);
  }
}

function byDescendingPriority(
  a: { readonly priority: number },
  b: { readonly priority: number },
): number {
  return b.priority - a.priority;
}

/**
 * Fail-fast validation for the registered rule set. Throws on duplicate rule
 * ids (within action rules, within special rules, or colliding across both
 * buckets) so conflicting or ambiguous interactions cannot load (audit DOM-002:
 * "duplicate or ambiguous rules fail during game compilation").
 */
export function validateInteractionRules(
  rules: readonly InteractionRule[],
  specialRules: readonly SpecialInventorySceneClickRule[] = [],
): void {
  const seen = new Map<string, string[]>();
  const record = (id: string, owner: string): void => {
    const owners = seen.get(id) ?? [];
    if (!owners.includes(owner)) {
      owners.push(owner);
    }
    seen.set(id, owners);
  };

  for (const rule of rules) {
    record(rule.id, rule.id);
  }
  for (const rule of specialRules) {
    record(rule.id, rule.id);
  }

  for (const [id, owners] of seen) {
    if (owners.length > 1) {
      throw new DuplicateInteractionRuleError(id, owners);
    }
  }
}
