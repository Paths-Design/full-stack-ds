/** references.ts — extracted from component-source.ts under
 * CODEGEN-NATIVE-EMITTER-SPLIT-01 (verbatim move; generated output
 * byte-identical). See component-source.ts for the dispatch order. */
import { kotlinEnumName, kotlinParamName, packageSegment, pascalCase } from "./kotlin/naming.js";
import type { BindingExpression, ComponentIR, DomNodeIR } from "../../ir.js";
import { kotlinMessage, kotlinStringDefault, kotlinStringLiteral } from "./messages.js";
import { textSourceOf } from "../native-messages.js";

/**
 * Component-reference lowering (FEAT-COMPOSE-REFERENCE-REALIZATION-01): lower
 * a dom node that declares `componentRef` to a call on the referenced
 * generated composable. The call is assembled from the node's own IR facts
 * through one declared fact vocabulary; a fact outside that vocabulary fails
 * loudly at emit time, so a declared reference is never silently dropped and
 * never silently mis-argued.
 *
 * The vocabulary (every entry is a decision, not a default):
 *   attrs.name / bindings.name   -> `name` (a `valueMap` binding lowers to an
 *                                   exhaustive `when` over the source prop, and
 *                                   an incomplete map is an emit-time error)
 *   attrs.size                   -> `size = <Ref>Size.<Member>`
 *   attrs.variant                -> `variant = <Ref>Variant.<Member>`
 *   attrs["aria-label"]          -> `accessibilityLabel`
 *   attrs.disabled               -> `disabled`
 *   bindings.ariaLabel           -> `accessibilityLabel`
 *   bindings.disabled            -> `disabled`
 *   events.click                 -> `onClick = { <prop>?.invoke() }`
 *   children (role `trigger`)    -> `content = { ... }` (empty when the node
 *                                   projects nothing, because a composite
 *                                   control's content parameter is required)
 *   bindings.ariaHidden          -> `Modifier.clearAndSetSemantics { }`
 *   bindings.inline              -> structural: composing inline is the default
 *   attrs.type                   -> structural: HTML form authoring only
 *   bindings.ariaExpanded / ariaPressed
 *                                -> structural: the referenced control exposes
 *                                   no state-semantics parameter. Named here so
 *                                   the drop is a decision; ledgered in
 *                                   docs/architecture/native-target-admission.md.
 *   ifProp                       -> the call is wrapped in that guard
 */
export interface ReferenceArgumentOverride {
  /** The callee's parameter name. */
  parameter: string;
  /** The Kotlin expression the caller supplies. */
  expression: string;
}

export interface ReferenceCallFacts {
  reference: string;
  arguments: string[];
  modifiers: string[];
  body: string[];
  /** A composite control's content parameter is required, so a trigger
   *  reference always passes a body — empty when it projects nothing. */
  bodyRequired: boolean;
  guard?: { prop: string; negated: boolean; boolean: boolean };
}

export function referenceBindingExpr(ir: ComponentIR, expression: unknown): string {
  if (!expression || typeof expression !== "object") {
    throw new Error("component reference binding is not an expression");
  }
  const binding = expression as { kind?: string; prop?: string; path?: string[] };
  if (binding.kind === "message") {
    // A message passed to a child component resolves in the parent's
    // composition, so the child receives the already-localized string.
    const source = textSourceOf(ir, expression as BindingExpression);
    if (source?.kind !== "message" || source.ref.params.length > 0) {
      throw new Error("component reference message binding must be parameter-free");
    }
    return kotlinMessage(ir, source.ref.message);
  }
  if (binding.kind === "literal") {
    const literal = expression as { value?: string };
    if (typeof literal.value !== "string") {
      throw new Error("component reference literal binding has no string value");
    }
    return JSON.stringify(literal.value);
  }
  if (binding.kind !== "prop" || !binding.prop) {
    throw new Error(
      `component reference binding kind "${binding.kind ?? "(none)"}" has no parameter mapping`,
    );
  }
  const base = kotlinParamName(binding.prop);
  return (binding.path ?? []).reduce((acc, segment) => `${acc}.${segment}`, base);
}

/** Render a referenced node's projected children, or its required empty body. */
export function referenceBodyLines(ir: ComponentIR, node: DomNodeIR, indent: string): string[] {
  const lines: string[] = [];
  const emitContent = (child: DomNodeIR): void => {
    if (child.tag === "children") {
      lines.push(`${indent}content()`);
      return;
    }
    if (child.content && typeof child.content === "object") {
      const content = child.content as { kind?: string; prop?: string };
      if (content.kind === "prop" && content.prop) {
        const prop = ir.styledProps.find((p) => p.safeName === content.prop);
        if (prop?.type === "ReactNode") {
          lines.push(`${indent}${kotlinParamName(content.prop)}?.invoke()`);
          return;
        }
        if (prop?.type === "string") {
          lines.push(
            `${indent}BasicText(text = ${kotlinParamName(content.prop)}, style = TextStyle(color = LocalFsdsContentColor.current))`,
          );
          return;
        }
      }
    }
    const nested = child.children ?? [];
    if (nested.some((c) => c.tag === "children")) {
      nested.forEach(emitContent);
      return;
    }
    throw new Error(
      `component reference content node <${child.tag || "ref"}> has no mapped lowering`,
    );
  };
  (node.children ?? []).forEach(emitContent);
  return lines;
}

export function referenceCallFacts(
  ir: ComponentIR,
  node: DomNodeIR,
  indent: string,
  argumentOverrides: Record<string, ReferenceArgumentOverride> = {},
): ReferenceCallFacts {
  const reference = node.componentRef;
  if (!reference) throw new Error("referenceCallFacts requires a componentRef node");
  const facts: ReferenceCallFacts = {
    reference,
    arguments: [],
    modifiers: [],
    body: [],
    bodyRequired: false,
  };

  const enumArgument = (parameter: string, suffix: string, member: string): string =>
    `${parameter} = ${reference}${suffix}.${kotlinEnumName(member)}`;

  for (const [attr, value] of Object.entries(node.attrs ?? {})) {
    if (attr === "name") facts.arguments.push(`name = ${JSON.stringify(value)}`);
    else if (attr === "size") facts.arguments.push(enumArgument("size", "Size", value));
    else if (attr === "variant") facts.arguments.push(enumArgument("variant", "Variant", value));
    else if (attr === "aria-label") facts.arguments.push(`accessibilityLabel = ${kotlinStringLiteral(value)}`);
    else if (attr === "disabled") facts.arguments.push(`disabled = ${value === "true"}`);
    // HTML form authoring: `type` selects submit/reset browser behavior, which
    // no native target has. Structural, never an argument.
    else if (attr === "type") continue;
    else throw new Error(`component reference attr "${attr}" has no parameter mapping`);
  }

  for (const [binding, expression] of Object.entries(node.bindings ?? {})) {
    const override = argumentOverrides[binding];
    if (override) {
      // The contract's prop exists; the callee cannot take it. The caller
      // supplies the substitute, so the declared prop is realised as the
      // expression rather than dropped.
      facts.arguments.push(`${override.parameter} = ${override.expression}`);
      continue;
    }
    if (binding === "name") {
      const map = expression as {
        kind?: string;
        source?: { kind?: string; prop?: string };
        values?: Record<string, string>;
      };
      if (map.kind !== "valueMap" || !map.source?.prop || !map.values) {
        throw new Error('component reference `name` binding is not a prop valueMap');
      }
      const axisProp = ir.styledProps.find((p) => p.safeName === map.source!.prop);
      const declaredType = axisProp?.typeRefs?.find(
        (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
      );
      // The emitter names a variant axis enum `<Component><Axis>`, which the
      // contract's declared type name need not match.
      const axisType = axisProp ? `${ir.name}${pascalCase(axisProp.safeName)}` : declaredType;
      const axisValues = declaredType ? ir.definedTypes[declaredType]!.values! : [];
      const missing = axisValues.filter((value) => !(value in map.values!));
      if (missing.length > 0) {
        throw new Error(
          `component reference \`name\` map omits axis value(s) ${missing.join(", ")}`,
        );
      }
      const pad = `${indent}    `;
      const arms = axisValues.map(
        (value) => `${pad}${axisType}.${kotlinEnumName(value)} -> ${JSON.stringify(map.values![value])}`,
      );
      facts.arguments.push(
        `name = when (${kotlinParamName(map.source.prop)}) {\n${arms.join("\n")}\n${indent}}`,
      );
    } else if (binding === "ariaLabel") {
      facts.arguments.push(`accessibilityLabel = ${referenceBindingExpr(ir, expression)}`);
    } else if (binding === "disabled") {
      facts.arguments.push(`disabled = ${referenceBindingExpr(ir, expression)}`);
    } else if (binding === "ariaHidden") {
      facts.modifiers.push("Modifier.clearAndSetSemantics { }");
    } else if (binding === "ariaExpanded" || binding === "ariaPressed") {
      // Named, not silent: the referenced control exposes no state-semantics
      // parameter. Ledgered in the admission criteria.
      continue;
    } else if (binding === "inline") {
      continue;
    } else if (binding === "type") {
      // HTML form authoring (`button`/`submit`/`reset`), as in attrs.
      continue;
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(binding)) {
      // The default rule: a binding maps to the same-named callee parameter.
      // The cases above are the exceptions (ariaLabel -> accessibilityLabel,
      // HTML-only facts, state bindings the callee cannot take).
      facts.arguments.push(`${binding} = ${referenceBindingExpr(ir, expression)}`);
    } else {
      throw new Error(`component reference binding "${binding}" has no parameter mapping`);
    }
  }

  const click = node.events?.click;
  if (click) facts.arguments.push(`onClick = { ${referenceBindingExpr(ir, click)}?.invoke() }`);

  // A composite control's content parameter is required, so a trigger
  // reference always receives a body — empty when it projects nothing.
  const isTrigger = (ir.parts.find((p) => p.name === node.part)?.details?.role) === "trigger";
  facts.bodyRequired = isTrigger;
  if (isTrigger) facts.body = referenceBodyLines(ir, node, `${indent}    `);

  if (node.ifProp) {
    // A boolean prop is the guard; anything else can only be checked for
    // existence, which is how a nullable string gate reads.
    const guardProp = ir.styledProps.find((p) => p.safeName === node.ifProp);
    const boolean = guardProp?.type === "boolean";
    facts.guard = {
      prop: kotlinParamName(node.ifProp),
      negated: node.ifNegated,
      boolean,
    };
  }
  return facts;
}

/** Render one reference call at `indent`, wrapped in its declared guard. */
export function emitComponentReference(ir: ComponentIR, node: DomNodeIR, indent: string,
  extraModifiers: string[] = [],
  argumentOverrides: Record<string, ReferenceArgumentOverride> = {},
): string[] {
  const facts = referenceCallFacts(ir, node, indent, argumentOverrides);
  const lines: string[] = [];
  const inner = facts.guard ? `${indent}    ` : indent;
  if (facts.guard) {
    const check = facts.guard.boolean
      ? `${facts.guard.negated ? "!" : ""}${facts.guard.prop}`
      : `${facts.guard.prop} ${facts.guard.negated ? "==" : "!="} null`;
    lines.push(`${indent}if (${check}) {`);
  }
  const args = [...facts.arguments];
  facts.modifiers.push(...extraModifiers);
  if (facts.modifiers.length > 0) {
    const chain = facts.modifiers.map((m) => m.replace(/^Modifier\./, "")).join(".");
    args.push(`modifier = Modifier.${chain}`);
  }
  lines.push(`${inner}${facts.reference}(`);
  for (const argument of args) lines.push(`${inner}    ${argument},`);
  if (facts.bodyRequired) {
    lines.push(`${inner}) {`);
    lines.push(...facts.body);
    lines.push(`${inner}}`);
  } else {
    lines.push(`${inner})`);
  }
  if (facts.guard) lines.push(`${indent}}`);
  return lines;
}

/** Props a reference binds or handles, declared as parameters from the
 *  contract's own defaults; a binding with no declaration fails loudly. */
export function referenceParameterLines(ir: ComponentIR, node: DomNodeIR): string[] {
  const names = new Set<string>();
  // The render guard is a parameter too: the call is wrapped in it.
  if (node.ifProp) names.add(node.ifProp);
  for (const expression of [...Object.values(node.bindings ?? {}), ...Object.values(node.events ?? {})]) {
    const binding = expression as { kind?: string; prop?: string };
    if (binding.kind === "prop" && binding.prop) names.add(binding.prop);
  }
  const lines: string[] = [];
  for (const name of names) {
    const prop = ir.styledProps.find((p) => p.safeName === name);
    if (!prop) throw new Error(`reference bound prop "${name}" is not declared on ${ir.name}`);
    if (prop.type.startsWith("(")) lines.push(`    ${kotlinParamName(name)}: (() -> Unit)? = null,`);
    else if (prop.type === "boolean") lines.push(`    ${kotlinParamName(name)}: Boolean = ${prop.defaultExpr ?? "false"},`);
    else if (kotlinStringDefault(ir, prop) !== null) lines.push(`    ${kotlinParamName(name)}: String = ${kotlinStringDefault(ir, prop)},`);
    else lines.push(`    ${kotlinParamName(name)}: String? = null,`);
  }
  return lines;
}

/** Referenced parts of a kind, in dom order. */
export function referenceNodes(ir: ComponentIR, role: string) {
  const out: DomNodeIR[] = [];
  const walk = (node: DomNodeIR): void => {
    const part = ir.parts.find((p) => p.name === node.part);
    if (node.componentRef && part?.details?.role === role) out.push(node);
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

/** Import lines for every referenced component: its generated package, plus
 *  the axis enums the call names. The enum type for an axis is the emitter's
 *  own convention (`<Ref>Variant`, `<Ref>Size`), which is what makes a
 *  cross-component call expressible without the callee's signature. */
export function referenceImports(ir: ComponentIR): string[] {
  const refs = new Map<string, Set<string>>();
  const walk = (node: DomNodeIR): void => {
    if (node.componentRef) {
      const types = refs.get(node.componentRef) ?? new Set<string>();
      if (node.attrs?.variant) types.add(`${node.componentRef}Variant`);
      if (node.attrs?.size) types.add(`${node.componentRef}Size`);
      refs.set(node.componentRef, types);
    }
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  const lines: string[] = [];
  // JSON.stringify puts no space before a key, so the boundary must not be
  // anchored on whitespace.
  if (ir.dom && JSON.stringify(ir.dom).includes('"ariaHidden"')) {
    lines.push(`import androidx.compose.ui.semantics.clearAndSetSemantics`);
  }
  for (const ref of [...refs.keys()].sort()) {
    lines.push(`import com.fullstackds.components.${packageSegment(ref)}.${ref}`);
    for (const type of [...refs.get(ref)!].sort()) {
      lines.push(`import com.fullstackds.components.${packageSegment(ref)}.${type}`);
    }
  }
  return lines;
}
