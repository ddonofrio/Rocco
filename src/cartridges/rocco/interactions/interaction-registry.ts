import type {
  InteractionContext,
  InteractionDisposition,
  InteractionKind,
  InteractionRule,
  InteractionStage,
  SpecialInventorySceneClickRule,
} from './interaction-types';
import { DuplicateInteractionRuleError, resolveInteractionKind } from './interaction-types';
import type { RoccoGridMenuCarriedItem } from '../../../console/video/grid-menu';
import type { RoccoInventoryRuntimeSceneClickResolution } from '../levels/runtime/rocco-inventory-runtime-controller';

export interface InteractionDispatchOutcome {
  readonly matched: boolean;
  readonly disposition: InteractionDisposition | undefined;
}

interface RegisteredInteractionIdentity {
  readonly id: string;
  readonly ownerId: string;
}

/**
 * Owns the distributed interaction rules for a cartridge session (audit
 * ROCCO-016 / DOM-002). Feature modules register their own rules; the central
 * router builds an {@link InteractionContext} and delegates to {@link dispatch}.
 *
 * Dispatch selects the first rule whose `matches()` returns true within the
 * action kind, ordered by descending priority and a stable id tiebreaker.
 */
export class InteractionRegistry {
  private readonly actionRules = new Map<string, InteractionRule>();
  private readonly specialRules = new Map<string, SpecialInventorySceneClickRule>();

  private rulesForKind(
    kind: InteractionKind,
    stage: InteractionStage,
  ): readonly InteractionRule[] {
    const matching: InteractionRule[] = [];
    for (const rule of this.actionRules.values()) {
      if (rule.kind === kind && (rule.stage ?? 'default') === stage) {
        matching.push(rule);
      }
    }

    return matching.toSorted(byDescendingPriorityThenId);
  }

  register(rule: InteractionRule): void {
    this.registerMany([rule]);
  }

  registerSpecial(rule: SpecialInventorySceneClickRule): void {
    this.registerManySpecial([rule]);
  }

  registerMany(rules: readonly InteractionRule[]): void {
    validateInteractionRules(
      [...this.actionRules.values(), ...rules],
      this.getSpecialRules(),
    );

    for (const rule of rules) {
      this.actionRules.set(rule.id, rule);
    }
  }

  registerManySpecial(rules: readonly SpecialInventorySceneClickRule[]): void {
    validateInteractionRules(this.getRules(), [...this.specialRules.values(), ...rules]);

    for (const rule of rules) {
      this.specialRules.set(rule.id, rule);
    }
  }

  getRules(): readonly InteractionRule[] {
    return collectToSortedArray(this.actionRules.values(), byDescendingPriorityThenId);
  }

  getSpecialRules(): readonly SpecialInventorySceneClickRule[] {
    return collectToSortedArray(this.specialRules.values(), byDescendingPriorityThenId);
  }

  dispatch(context: InteractionContext, signal: AbortSignal): InteractionDisposition | undefined {
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
    if (signal.aborted) {
      return {
        matched: false,
        disposition: undefined,
      };
    }

    const kind = options.kind ?? resolveInteractionKind(context.action);
    const stage = options.stage ?? 'default';
    const candidates = this.rulesForKind(kind, stage);
    for (const rule of candidates) {
      if (signal.aborted) {
        return {
          matched: false,
          disposition: undefined,
        };
      }

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
    signal: AbortSignal,
  ): RoccoInventoryRuntimeSceneClickResolution {
    if (signal.aborted) {
      return { handled: false };
    }

    const candidates = this.getSpecialRules();
    for (const rule of candidates) {
      if (signal.aborted) {
        return { handled: false };
      }

      if (!rule.matches(context, carriedItem)) {
        continue;
      }

      const result = rule.execute(context, carriedItem, signal);
      if (result.handled) {
        return result;
      }
    }

    return { handled: false };
  }
}

function byDescendingPriorityThenId(
  a: { readonly id: string; readonly priority: number },
  b: { readonly id: string; readonly priority: number },
): number {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  return a.id.localeCompare(b.id);
}

function collectToSortedArray<T>(values: Iterable<T>, compare: (a: T, b: T) => number): T[] {
  return [...values].toSorted(compare);
}

/**
 * Fail-fast validation for the registered rule set. Throws on duplicate rule
 * ids within action rules, within special rules, or colliding across both
 * buckets so conflicting or ambiguous interactions cannot load.
 */
export function validateInteractionRules(
  rules: readonly InteractionRule[],
  specialRules: readonly SpecialInventorySceneClickRule[] = [],
): void {
  const registrations = new Map<string, RegisteredInteractionIdentity[]>();

  const record = (identity: RegisteredInteractionIdentity): void => {
    const existing = registrations.get(identity.id) ?? [];
    registrations.set(identity.id, [...existing, identity]);
  };

  for (const rule of rules) {
    record({ id: rule.id, ownerId: rule.ownerId });
  }

  for (const rule of specialRules) {
    record({ id: rule.id, ownerId: rule.ownerId });
  }

  for (const [id, owners] of registrations) {
    if (owners.length <= 1) {
      continue;
    }

    throw new DuplicateInteractionRuleError(
      id,
      owners.map((owner) => owner.ownerId),
    );
  }
}
