/**
 * Shared plan shapes for the GPUI emitter.
 *
 * Both the bounded planners in `factory.ts` and the generic anatomy projection
 * in `anatomy.ts` produce these shapes, so the Rust file projection has one
 * input contract regardless of which planner admitted the component.
 */
import type { ComponentIR } from '../../ir.js';
import type { NativeStyleRuleIR } from '../../native-style-rules.js';

export type GpuiChannel = NonNullable<ComponentIR['formControl']>['channel'];

export interface GpuiAxisPlan {
  propName: string;
  method: string;
  values: string[];
  defaultExpr?: string;
}

export interface GpuiOmission {
  /** Machine-readable omission family (`componentRef`, `style-property`, `control`, …). */
  kind: string;
  /** The contract fact or style source key the omission applies to. */
  source: string;
  /** Why the projection cannot realise the fact. */
  reason: string;
  /** The support-boundary rule that adjudicated the family, when one applies. */
  boundary?: string;
  /** That rule's disposition (`pending` / `refused` / `lowered`). */
  disposition?: string;
}

/** One by-reference child component the projection renders and retains. */
export interface GpuiRefPlan {
  /** Generated struct field that retains the child entity. */
  field: string;
  /** Referenced generated component type name. */
  refType: string;
  /** Static literal props projected onto the child's generated builders. */
  attrs: Array<{ prop: string; literal: string }>;
  /** Parent-state-driven props updated through the child's generated setters each render. */
  dynamic: Array<{ prop: string; setter: string; expr: string }>;
  /** Reference events forwarded to a realized parent callback. */
  events: Array<{ targetHandlerProp: string; setter: string; parentField: string }>;
  /** Facts of the reference that the projection does not realize. */
  omissions: GpuiOmission[];
}

/** A consumer-supplied callback realized as a stored handler field. */
export interface GpuiCallbackPlan {
  prop: string;
  field: string;
}

/** A native part that invokes one stored callback on activation. */
export interface GpuiActivationPlan {
  part: string;
  handler: string;
  /** Root hosts also take focus and keyboard activation. */
  keyboard: boolean;
}

export interface GpuiPlan {
  channel: GpuiChannel | undefined;
  part: string | undefined;
  valueMethod: string | undefined;
  defaultMethod: string | undefined;
  disabledMethod: string | undefined;
  mixedProp: string | undefined;
  axes: GpuiAxisPlan[];
  boolProps: string[];
  textProps: string[];
  childContent: boolean;
  slots: string[];
  slotVariants: string[];
  defaultValue: string;
  disabledDefault: string;
  keys: readonly string[];
  excludedProps: string[];
  /** Retained by-reference children, in anatomy pre-order. */
  refs: GpuiRefPlan[];
  /** Realized callback props (stored handlers). */
  callbacks: GpuiCallbackPlan[];
  /** Anatomy parts that invoke a stored callback. */
  activations: GpuiActivationPlan[];
  omissions: GpuiOmission[];
}

/** Style-side omission. The bounded planner keeps the authored shape; the
 * generic projection adds the boundary adjudication for the same declaration. */
export interface GpuiStyleOmission {
  sourceKey: string;
  property?: string;
  reason: string;
  boundary?: string;
  disposition?: string;
}

export interface GpuiStylePlan {
  rules: NativeStyleRuleIR[];
  omissions: GpuiStyleOmission[];
}
