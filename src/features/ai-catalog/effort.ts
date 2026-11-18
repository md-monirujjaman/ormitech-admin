import type { ReasoningEffort } from './types';

/** The efforts a routed request can carry, lowest to highest. */
export const EFFORT_SCALE = ['none', 'minimal', 'low', 'medium', 'high'] as const;

/**
 * What is actually sent to a model for the effort asked for. The same rule ormitech-api applies (`effectiveReasoningEffort`), repeated here
 * only so the screen can show the result while the form is being edited:
 * `default` and a model whose accepted efforts are not recorded send nothing; an accepted effort is sent as asked; otherwise the
 * nearest accepted one (ties to the lower); nothing when the model accepts none of these.
 */
export function effectiveEffort(requested: ReasoningEffort, accepted: readonly string[] | null | undefined): ReasoningEffort {
  if (requested === 'default' || !accepted) return 'default';
  const usable = EFFORT_SCALE.filter((effort) => accepted.includes(effort));
  if (usable.length === 0) return 'default';
  if ((usable as readonly string[]).includes(requested)) return requested;
  const want = EFFORT_SCALE.indexOf(requested as (typeof EFFORT_SCALE)[number]);
  return [...usable].sort((a, b) => Math.abs(EFFORT_SCALE.indexOf(a) - want) - Math.abs(EFFORT_SCALE.indexOf(b) - want) || EFFORT_SCALE.indexOf(a) - EFFORT_SCALE.indexOf(b))[0]!;
}
