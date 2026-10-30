import type { NormalizedDismissalTriggerIR } from "./ir.js";

/** The normalized trigger owns gate names; backends supply only prop syntax. */
export function dismissalGateProps(trigger: NormalizedDismissalTriggerIR | undefined): readonly string[] {
  return trigger?.enabledByProps ?? (trigger?.enabledByProp ? [trigger.enabledByProp] : []);
}

export function dismissalGateExpression(
  trigger: NormalizedDismissalTriggerIR | undefined,
  accessor: (prop: string) => string,
): string {
  const fallback = trigger?.defaultEnabled ?? true;
  const gates = dismissalGateProps(trigger);
  return gates.length ? gates.map(prop => `(${accessor(prop)} ?? ${fallback})`).join(" && ") : String(fallback);
}
