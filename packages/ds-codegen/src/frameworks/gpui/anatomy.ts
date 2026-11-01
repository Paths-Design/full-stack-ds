/**
 * Generic anatomy projection for GPUI.
 *
 * The bounded planners in `factory.ts` admit a narrow set of shapes: a single
 * boolean control, or a static text/rule anatomy. Every other contract in the
 * corpus still has to project *something* an engine consumer can mount, and the
 * projection has to be honest about what it does not realise.
 *
 * This module plans that projection. It never dispatches on component identity:
 * it walks the normalized anatomy tree and the contract's prop/variant facts,
 * lowers what the GPUI substrate can carry, and files every fact it cannot carry
 * as a named omission (with the support-boundary rule that adjudicated it) so
 * the capability receipt states the gap instead of hiding it.
 *
 * A projection is byte-stable because plans are pure functions of IR + the
 * committed ledger; nothing here reads the clock, the filesystem or identity.
 */
import type { ComponentIR, DomNodeIR } from '../../ir.js';
import { hasChildrenPlaceholder } from '../../ir.js';
import { collectDomSlots } from '../native-emission-class.js';
import { classifyProp, loadBoundary, type GpuiBoundary } from './boundary.js';
import { supported, validScalar } from './style-vocabulary.js';
import type { GpuiActivationPlan, GpuiCallbackPlan, GpuiOmission, GpuiPlan, GpuiRefPlan, GpuiStyleOmission, GpuiStylePlan } from './plan-types.js';

const RESERVED = new Set(['self','super','crate','type','mod','fn','match','default','new','request_change','theme','variants','label','focus_handle','request_key','content','set_content','clear_content','has_content','render_content','slot','slots','slot_key','set_slot','clear_slot','has_slot','render_slot']);

const RUST_KEYWORDS = new Set(['as','break','const','continue','crate','dyn','else','enum','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return','self','static','struct','super','trait','true','type','unsafe','use','where','while','async','await','abstract','become','box','do','final','macro','override','priv','typeof','unsized','virtual','yield','try','gen']);

/** Rust-safe snake_case identifier, or undefined when the name cannot be emitted. */
function identifier(name: string): string | undefined {
  const value = name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(value) || RESERVED.has(value) || RUST_KEYWORDS.has(value)) return undefined;
  return value;
}

function slotVariant(name: string): string | undefined {
  if (!/^[a-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$/.test(name)) return undefined;
  const value = name.split(/[-_]/).map(word => word[0]!.toUpperCase() + word.slice(1)).join('');
  return value === 'Self' ? undefined : value;
}

type PropKind = 'boolean' | 'string' | 'other';
function propKind(ir: ComponentIR, name: string): PropKind {
  const prop = ir.styledProps.find(candidate => candidate.name === name);
  if (!prop) return 'other';
  const type = prop.propType;
  if (type.kind === 'boolean') return 'boolean';
  if (type.kind === 'string') return 'string';
  if (type.kind === 'fallback') {
    const raw = type.raw.replace(/\s+/g, '');
    if (raw === 'boolean' || raw === 'boolean|undefined') return 'boolean';
    if (raw === 'string' || raw === 'string|undefined') return 'string';
  }
  return 'other';
}

function boundaryReason(boundary: GpuiBoundary, ruleId: string, fallback: string): { reason: string; boundary: string; disposition: string } {
  const rule = boundary.rules.find(candidate => candidate.id === ruleId);
  return {
    reason: rule?.reason ?? rule?.via ?? fallback,
    boundary: ruleId,
    disposition: rule?.disposition ?? 'refused',
  };
}

/** Props the contract's own control facts own; the anatomy projection omits their semantics. */
function channelPropNames(ir: ComponentIR): Set<string> {
  const names = new Set<string>();
  const add = (channel: { valueProp?: string; defaultValueProp?: string; changeHandlerProp?: string } | undefined) => {
    if (!channel) return;
    if (channel.valueProp) names.add(channel.valueProp);
    if (channel.defaultValueProp) names.add(channel.defaultValueProp);
    if (channel.changeHandlerProp) names.add(channel.changeHandlerProp);
  };
  add(ir.formControl?.channel);
  for (const channel of ir.behavior.normalizedChannels) add(channel);
  return names;
}

/** Rust string literal with control characters encoded (matches the emitter). */
function q(value: string): string {
  const escapes: Record<string, string> = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
  return '"' + Array.from(value).map(character => escapes[character] ?? ((character.codePointAt(0)! < 32 || character.codePointAt(0) === 127) ? `\\u{${character.codePointAt(0)!.toString(16)}}` : character)).join('') + '"';
}

/** A contract with no authored anatomy still emits a mountable root. */
function emptyRoot(): DomNodeIR {
  return {
    tag: 'div', componentRef: undefined, slotName: undefined, part: 'root',
    attrs: {}, bindings: {}, propertyBindings: {}, events: {},
    content: undefined, children: [], ifProp: undefined, ifNegated: false,
    iteration: undefined, cssVarBindings: [], iconGlyph: undefined,
    generatedIdSlug: undefined, idRefAttrs: [],
  } as DomNodeIR;
}

/** Static literal attrs a ref projects onto the child's generated builders. */
function projectedRefAttrs(instance: NonNullable<DomNodeIR['componentInstance']>): Array<{ prop: string; literal: string }> {
  const projected: Array<{ prop: string; literal: string }> = [];
  for (const entry of instance.attrs ?? []) {
    if (entry.kind !== 'prop' || typeof entry.value !== 'string' || typeof entry.targetProp !== 'string') continue;
    if (!identifier(entry.targetProp)) continue;
    const literal = entry.propType?.kind === 'boolean'
      ? (entry.value === 'true' ? 'true' : 'false')
      : q(entry.value);
    projected.push({ prop: entry.targetProp, literal });
  }
  return projected;
}

/** Retained ref plans in anatomy pre-order (the Rust tree walk consumes them in the same order). */
function collectRefs(dom: DomNodeIR, omissions: GpuiOmission[], state: AnatomyState): GpuiRefPlan[] {
  const refs: GpuiRefPlan[] = [];
  const used = new Set<string>();
  const visit = (node: DomNodeIR): void => {
    if (node.componentRef) {
      const instance = node.componentInstance;
      const base = identifier(node.part ?? node.componentRef) ?? identifier(node.componentRef) ?? 'child';
      let field = `ref_${base}`;
      let suffix = 2;
      while (used.has(field)) field = `ref_${base}_${suffix++}`;
      used.add(field);
      const attrs = instance ? projectedRefAttrs(instance) : [];
      const dynamic: GpuiRefPlan['dynamic'] = [];
      const events: GpuiRefPlan['events'] = [];
      const refOmissions: GpuiOmission[] = [];
      for (const binding of instance?.bindings ?? []) {
        const setter = typeof binding.targetProp === 'string' ? identifier(binding.targetProp) : undefined;
        const expression = binding.expr;
        const omitted = (reason: string) => refOmissions.push({ kind: 'ref-binding', source: `${field}.${binding.targetProp}`, reason, boundary: 'anatomy-component-ref-props', disposition: 'pending' });
        if (!setter) { omitted('child prop has no projected setter (reserved or missing target prop)'); continue; }
        const targetProp = binding.targetProp as string;
        if (expression.kind === 'prop' && typeof expression.prop === 'string' && !expression.path?.length) {
          const prop = expression.prop;
          if (state.realizedBoolean.has(prop)) dynamic.push({ prop: targetProp, setter: `set_${setter}`, expr: `self.${identifier(prop) ?? prop}` });
          else if (state.realizedText.has(prop)) dynamic.push({ prop: targetProp, setter: `set_${setter}`, expr: `self.${identifier(prop) ?? prop}.clone()` });
          else if (state.realizedAxes.has(prop)) dynamic.push({ prop: targetProp, setter: `set_${setter}`, expr: `self.variant_values.get(${q(prop)}).cloned().unwrap_or_default()` });
          else omitted(`parent prop ${prop} is not realized by this projection`);
          continue;
        }
        if (expression.kind === 'literal' && typeof expression.value === 'string') {
          dynamic.push({ prop: targetProp, setter: `set_${setter}`, expr: q(expression.value) });
          continue;
        }
        omitted(`binding expression '${expression.kind}' has no parent-state lowering in this projection`);
      }
      for (const event of instance?.events ?? []) {
        const targetHandler = typeof event.targetHandlerProp === 'string' ? identifier(event.targetHandlerProp) : undefined;
        const expression = event.expr;
        if (targetHandler && expression.kind === 'prop' && typeof expression.prop === 'string' && state.wiredCallbacks.has(expression.prop)) {
          const parentField = identifier(expression.prop);
          if (parentField) {
            events.push({ targetHandlerProp: String(event.targetHandlerProp), setter: `set_${targetHandler}`, parentField });
            continue;
          }
        }
        refOmissions.push({ kind: 'ref-event', source: `${field}.${event.targetHandlerProp}`, reason: `child event expression '${expression.kind}' has no parent-callback forwarding`, boundary: 'anatomy-component-ref-dynamic', disposition: 'pending' });
      }
      for (const entry of instance?.attrs ?? []) {
        const projected = entry.kind === 'prop' && typeof entry.value === 'string' && typeof entry.targetProp === 'string' && Boolean(identifier(entry.targetProp));
        if (!projected) {
          refOmissions.push({ kind: 'ref-attr', source: `${field}.${entry.targetProp ?? entry.sourceAttr ?? 'attr'}`, reason: 'child prop has no projected builder (reserved or non-literal)', boundary: 'anatomy-component-ref-props', disposition: 'pending' });
        }
      }
      if (!instance) refOmissions.push({ kind: 'ref-instance', source: field, reason: 'component instance facts were unavailable at IR build time', boundary: 'anatomy-component-ref', disposition: 'pending' });
      omissions.push(...refOmissions);
      const children = node.children.flatMap(child => collectRefs(child, omissions, state));
      refs.push({ field, refType: node.componentRef, attrs, dynamic, events, children, omissions: refOmissions });
      return;
    }
    for (const child of node.children) visit(child);
  };
  visit(dom);
  return refs;
}

interface AnatomyState {
  boundary: GpuiBoundary;
  /** Callback props realized as stored handlers; their click events are wired. */
  wiredCallbacks: Set<string>;
  omissions: GpuiOmission[];
  realizedText: Set<string>;
  realizedBoolean: Set<string>;
  realizedAxes: Set<string>;
  realizedSlots: string[];
}

function omit(state: AnatomyState, omission: GpuiOmission): void {
  state.omissions.push(omission);
}

/** Strip facts the anatomy projection cannot carry, recording each one. */
function transformNode(node: DomNodeIR, state: AnatomyState): DomNodeIR | null {
  if (node.componentRef) {
    // By-reference composition: the node renders a retained child component.
    // Nested references become that child's content; other nested children are
    // named as omissions (they would need the content API too).
    const copy: DomNodeIR = structuredClone(node);
    for (const child of copy.children) {
      if (!child.componentRef) {
        omit(state, {
          kind: 'ref-children',
          source: `${node.componentRef}${node.part ? `.${node.part}` : ''}`,
          reason: 'non-reference child nested inside a by-reference node has no content projection',
          boundary: 'anatomy-component-ref-dynamic',
          disposition: 'pending',
        });
      }
    }
    copy.children = copy.children.filter(child => child.componentRef);
    copy.bindings = {};
    copy.events = {};
    copy.attrs = {};
    copy.cssVarBindings = [];
    copy.iteration = undefined;
    return copy;
  }
  if (node.iteration) {
    omit(state, { kind: 'iteration', source: node.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-iteration', 'iteration over data collections has no GPUI render loop') });
    return null;
  }
  const copy: DomNodeIR = structuredClone(node);
  if (copy.tag === 'slot' && copy.slotName && !state.realizedSlots.includes(copy.slotName)) {
    omit(state, { kind: 'slot', source: copy.slotName, ...boundaryReason(state.boundary, 'slots', 'slot identifier cannot be projected onto a Rust slot key') });
    return null;
  }
  if (copy.iconGlyph) {
    omit(state, { kind: 'iconGlyph', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-icon-glyph', 'no glyph/svg rendering is realized') });
    copy.iconGlyph = undefined;
  }
  if (copy.content && 'transform' in copy.content) {
    omit(state, { kind: 'contentTransform', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-content-transform', 'content transforms have no GPUI renderer') });
    copy.content = undefined;
  }
  if (copy.content && !('transform' in copy.content)) {
    const content = copy.content;
    if (content.kind === 'prop' && !state.realizedText.has(content.prop)) {
      omit(state, { kind: 'content', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-content', 'content prop is not realized by this projection') });
      copy.content = undefined;
    } else if (content.kind !== 'prop' && content.kind !== 'literal') {
      omit(state, { kind: 'content', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-content', 'content shape has no GPUI projection') });
      copy.content = undefined;
    }
  }
  if (copy.cssVarBindings.length) {
    omit(state, { kind: 'cssVarBindings', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-css-variable-bindings', 'CSS variable carriers have no GPUI binding channel') });
    copy.cssVarBindings = [];
  }
  const bindingRule = (key: string): string => {
    if (key === 'disabled') return 'anatomy-disabled-binding';
    if (key === 'aria-label') return 'anatomy-aria-label-binding';
    if (['checked','open','expanded','value','index','month','search'].includes(key)) return 'anatomy-channel-binding';
    if (key === 'placeholder') return 'anatomy-placeholder-binding';
    if (['href','target','rel'].includes(key)) return 'anatomy-navigation-binding';
    if (['src','alt'].includes(key)) return 'anatomy-media-binding';
    if (key === 'datetime') return 'anatomy-dom-binding-datetime';
    if (key === 'title') return 'anatomy-dom-binding-title';
    if (key === 'role') return 'anatomy-dom-binding-role';
    if (['width','height','loading','sizes'].includes(key)) return 'anatomy-dom-binding-media';
    if (['required','aria-invalid'].includes(key)) return 'anatomy-validation-binding';
    if (['htmlFor','form'].includes(key)) return 'anatomy-association-binding';
    if (key === 'tabindex') return 'anatomy-focus-binding';
    if (key === 'name') return 'anatomy-form-binding';
    return 'anatomy-dom-binding-empty';
  };
  for (const key of Object.keys(copy.bindings)) {
    omit(state, { kind: 'binding', source: `${copy.part ?? 'root'}/${key}`, ...boundaryReason(state.boundary, bindingRule(key), `${key} binding is not consumed by the GPUI projection`) });
  }
  copy.bindings = {};
  for (const key of Object.keys(copy.propertyBindings)) {
    omit(state, { kind: 'propertyBinding', source: `${copy.part ?? 'root'}/${key}`, ...boundaryReason(state.boundary, 'anatomy-dom-properties', `${key} DOM property binding has no GPUI carrier`) });
  }
  copy.propertyBindings = {};
  for (const key of Object.keys(copy.events)) {
    const binding = copy.events[key];
    if (key === 'click' && binding?.kind === 'prop' && state.wiredCallbacks.has(binding.prop)) continue;
    const rule = key === 'click' ? 'anatomy-click-event' : ['keydown','keyup','keypress'].includes(key) ? 'anatomy-keyboard-event' : 'anatomy-focus-event';
    omit(state, { kind: 'event', source: `${copy.part ?? 'root'}/${key}`, ...boundaryReason(state.boundary, rule, `${key} event is not consumed by the GPUI projection`) });
  }
  copy.events = {};
  for (const key of Object.keys(copy.attrs)) {
    const rule = key.startsWith('aria-') ? 'anatomy-dom-attrs-aria'
      : key === 'role' ? 'anatomy-dom-attrs-role'
      : key.startsWith('data-') ? 'anatomy-dom-attrs-data'
      : ['fill','xmlns'].includes(key) ? 'anatomy-glyph-svg-attrs'
      : ['type','inputmode','autocomplete','spellcheck','scope'].includes(key) ? 'anatomy-dom-attrs-dom'
      : key === 'maxlength' ? 'anatomy-dom-attrs-maxlength'
      : 'anatomy-dom-binding-empty';
    omit(state, { kind: 'attr', source: `${copy.part ?? 'root'}/${key}`, ...boundaryReason(state.boundary, rule, `${key} attribute has no GPUI projection`) });
  }
  copy.attrs = {};
  if (copy.generatedIdSlug || copy.idRefAttrs.length) {
    omit(state, { kind: 'relationships', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'relationships', 'idref relationships have no GPUI carrier') });
    copy.generatedIdSlug = undefined;
    copy.idRefAttrs = [];
  }
  if (copy.keyboardActions?.length || copy.keyboardPanel || copy.keyboardAnchor || copy.focusContainer) {
    omit(state, { kind: 'keyboard', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-keyboard-event', 'keyboard behaviours have no GPUI carrier in this projection') });
    copy.keyboardActions = [];
    copy.keyboardPanel = false;
    copy.keyboardAnchor = false;
    copy.focusContainer = false;
  }
  if (copy.nativeTextChannel || copy.nativeRadioChannel || copy.activation) {
    omit(state, { kind: 'nativeChannel', source: copy.part ?? 'root', ...boundaryReason(state.boundary, 'anatomy-channel-binding', 'native text/radio channels have no GPUI carrier in this projection') });
    copy.nativeTextChannel = undefined;
    copy.nativeRadioChannel = undefined;
    copy.activation = undefined;
  }
  if (copy.ifSlot && !state.realizedSlots.includes(copy.ifSlot)) {
    omit(state, { kind: 'guard', source: `${copy.part ?? 'root'}/${copy.ifSlot}`, ...boundaryReason(state.boundary, 'anatomy-guards', 'slot presence guard has no realized slot carrier') });
    copy.ifSlot = undefined;
  }
  if (copy.ifProp && copy.ifProp !== 'children'
    && !state.realizedBoolean.has(copy.ifProp)
    && !state.realizedText.has(copy.ifProp)
    && !state.realizedAxes.has(copy.ifProp)) {
    omit(state, { kind: 'guard', source: `${copy.part ?? 'root'}/${copy.ifProp}`, ...boundaryReason(state.boundary, 'anatomy-guards', `guard prop ${copy.ifProp} is not realized by this projection`) });
    copy.ifProp = undefined;
    copy.ifNegated = false;
  }
  const children: DomNodeIR[] = [];
  for (const child of copy.children) {
    const transformed = transformNode(child, state);
    if (transformed) children.push(transformed);
  }
  copy.children = children;
  return copy;
}

function nodesOf(node: DomNodeIR | undefined): DomNodeIR[] {
  const nodes: DomNodeIR[] = [];
  const visit = (candidate: DomNodeIR) => {
    nodes.push(candidate);
    candidate.children.forEach(visit);
  };
  if (node) visit(node);
  return nodes;
}

/**
 * Plan the generic anatomy projection. Returns a cloned IR whose anatomy only
 * carries facts this projection can render, the plan the Rust projection
 * consumes, and every fact the projection dropped with its boundary rule.
 */
export function gpuiAnatomyPlan(ir: ComponentIR, boundary: GpuiBoundary = loadBoundary()): { ir: ComponentIR; plan: GpuiPlan; omissions: GpuiOmission[] } {
  const state: AnatomyState = { boundary, wiredCallbacks: new Set(), omissions: [], realizedText: new Set(), realizedBoolean: new Set(), realizedAxes: new Set(), realizedSlots: [] };

  // Realize variant axes first: guards and styles both depend on them.
  const usedMethods = new Set<string>();
  const axes = ir.classRecipe.valueModifiers.flatMap(modifier => {
    const values = ir.variants[modifier.propName];
    if (!values?.length) return [];
    const method = identifier(modifier.propName);
    if (!method) {
      omit(state, { kind: 'axis', source: modifier.propName, ...boundaryReason(boundary, 'variants', 'variant axis name cannot be projected onto a Rust identifier') });
      return [];
    }
    if (usedMethods.has(method)) {
      omit(state, { kind: 'axis', source: modifier.propName, ...boundaryReason(boundary, 'variants', 'variant axis identifier collides with another realized method') });
      return [];
    }
    usedMethods.add(method);
    state.realizedAxes.add(modifier.propName);
    return [{ propName: modifier.propName, method, values, defaultExpr: modifier.defaultExpr }];
  });

  // Slots before the tree walk so slot guards can be adjudicated in one pass.
  const slotNames = ir.dom ? collectDomSlots(ir.dom) : [];
  const slotVariants: string[] = [];
  const realizedSlots: string[] = [];
  for (const name of slotNames) {
    const variant = slotVariant(name);
    if (!variant) {
      omit(state, { kind: 'slot', source: name, ...boundaryReason(boundary, 'slots', 'slot identifier cannot be projected onto a Rust slot key') });
      continue;
    }
    if (slotVariants.includes(variant)) {
      omit(state, { kind: 'slot', source: name, ...boundaryReason(boundary, 'slots', 'slot identifier collides with another slot key') });
      continue;
    }
    slotVariants.push(variant);
    realizedSlots.push(name);
  }
  state.realizedSlots = realizedSlots;

  // Realize props that carry a value this projection can hold: booleans as
  // fields (guards/styles read them) and strings as retained text.
  const channelProps = channelPropNames(ir);
  const boolProps: string[] = [];
  const textProps: string[] = [];
  const omittedProps: string[] = [];
  const omissionFor = (name: string, reason: string): GpuiOmission => {
    const classified = classifyProp(boundary, name);
    return { kind: 'prop', source: name, boundary: classified.rule, disposition: classified.disposition, reason: classified.disposition === 'lowered' ? reason : classified.reason ?? reason };
  };
  for (const prop of ir.styledProps) {
    const method = identifier(prop.name);
    if (channelProps.has(prop.name)) {
      omittedProps.push(prop.name);
      omit(state, omissionFor(prop.name, 'control semantics are realized only by the bounded control planner, which does not admit this component shape'));
      continue;
    }
    if (!method) {
      omittedProps.push(prop.name);
      omit(state, omissionFor(prop.name, 'prop name cannot be projected onto a Rust identifier'));
      continue;
    }
    const kind = propKind(ir, prop.name);
    if (kind === 'boolean') {
      const defaultExpr = prop.defaultExpr ?? 'false';
      if (defaultExpr !== 'true' && defaultExpr !== 'false') {
        omittedProps.push(prop.name);
        omit(state, omissionFor(prop.name, 'boolean default is not a literal true/false'));
        continue;
      }
      if (usedMethods.has(method)) {
        omittedProps.push(prop.name);
        omit(state, omissionFor(prop.name, 'prop identifier collides with another realized method'));
        continue;
      }
      usedMethods.add(method);
      boolProps.push(prop.name);
      state.realizedBoolean.add(prop.name);
      continue;
    }
    if (kind === 'string') {
      if (usedMethods.has(method)) {
        omittedProps.push(prop.name);
        omit(state, omissionFor(prop.name, 'prop identifier collides with another realized method'));
        continue;
      }
      usedMethods.add(method);
      textProps.push(prop.name);
      state.realizedText.add(prop.name);
      continue;
    }
    omittedProps.push(prop.name);
    omit(state, omissionFor(prop.name, 'prop type has no GPUI field projection'));
  }

  // Callback props are consumer handlers: stored, and invoked by wired events.
  // The contract's event payload is narrowed to window/app access.
  const callbacks: GpuiCallbackPlan[] = [];
  for (const prop of ir.styledProps) {
    if (prop.propType.kind !== 'callback') continue;
    const method = identifier(prop.name);
    if (!method) {
      omit(state, omissionFor(prop.name, 'callback prop name cannot be projected onto a Rust identifier'));
      continue;
    }
    if (usedMethods.has(method)) {
      omit(state, omissionFor(prop.name, 'callback prop identifier collides with another realized method'));
      continue;
    }
    usedMethods.add(method);
    callbacks.push({ prop: prop.name, field: method });
    state.wiredCallbacks.add(prop.name);
  }

  // Content-bound props must be realized text fields; add any the prop walk missed.
  for (const node of nodesOf(ir.dom)) {
    if (node.content && 'kind' in node.content && node.content.kind === 'prop' && !state.realizedText.has(node.content.prop)) {
      const name = node.content.prop;
      if (!omittedProps.includes(name)) {
        const method = identifier(name);
        if (method && propKind(ir, name) === 'string' && !usedMethods.has(method)) {
          usedMethods.add(method);
          textProps.push(name);
          state.realizedText.add(name);
        } else {
          omittedProps.push(name);
          omit(state, omissionFor(name, 'content prop cannot be realized as retained text'));
        }
      }
    }
  }

  // Disabled is the one control-adjacent fact the projection keeps: styles and
  // guards predicate on it, and a boolean field carries it honestly.
  let disabledMethod: string | undefined;
  for (const node of nodesOf(ir.dom)) {
    const binding = node.bindings.disabled;
    if (binding?.kind === 'prop' && !binding.path?.length) {
      const method = identifier(binding.prop);
      if (method && state.realizedBoolean.has(binding.prop)) disabledMethod = method;
    }
  }

  const dom = transformNode(ir.dom ?? emptyRoot(), state);
  if (!dom) throw new Error(`GPUI_ANATOMY_ROOT_OMITTED: ${ir.name}`);
  const refs = collectRefs(dom, state.omissions, state);
  // A native part's click event bound to a realized callback prop invokes it.
  // Read from the original anatomy: the projection clears event maps.
  const activations: GpuiActivationPlan[] = [];
  const visitActivations = (node: DomNodeIR, isRoot: boolean): void => {
    const click = node.events?.click;
    if (click?.kind === 'prop' && state.wiredCallbacks.has(click.prop)) {
      const handler = identifier(click.prop);
      if (handler) activations.push({ part: node.part ?? 'root', handler, keyboard: isRoot });
    }
    node.children.forEach(child => visitActivations(child, false));
  };
  if (ir.dom && !ir.dom.componentRef) visitActivations(ir.dom, true);
  const transformed: ComponentIR = { ...ir, dom };
  const childContent = hasChildrenPlaceholder(transformed) || nodesOf(dom).some(node => node.tag === 'children' || node.tag === 'slot' && !node.slotName);

  // Contract-level capabilities the projection does not realize. These are
  // single facts on the IR, so the receipt names each family once instead of
  // trying to infer it from omitted nodes.
  const topLevel: Array<[boolean, string, string, string]> = [
    [Boolean(ir.surface), 'surface', 'surface-layer', 'overlay positioning, modality and dismissal have no GPUI overlay runtime'],
    [Boolean(ir.interaction), 'interaction', 'interaction', 'disclosure/paging/selection interaction has no GPUI state model'],
    [Boolean(ir.formControl), 'control', 'form-control', 'control semantics are realized only by the bounded boolean-control planner, which does not admit this shape'],
    [Boolean(ir.compositeControl), 'compositeControl', 'composite-control', 'composite control state has no GPUI realization'],
    [Boolean(ir.pagedSet), 'pagedSet', 'paged-set', 'paged sets have no GPUI state model'],
    [Boolean(ir.dateGrid), 'dateGrid', 'date-grid', 'date grids have no GPUI state model'],
    [Boolean(ir.transfer), 'transfer', 'transfer', 'transfer selection has no GPUI state model'],
    [Boolean(ir.motion.sequence), 'motion', 'motion', 'motion sequences have no GPUI animation runtime'],
    [ir.messages.length > 0, 'messages', 'messages', 'message catalogs are not lowered by this target'],
    [ir.unresolvedA11yObligations.length > 0, 'a11y', 'a11y', 'no accessibility mapping is realized'],
    [ir.keyboardActions.length > 0, 'keyboard', 'anatomy-keyboard-event', 'keyboard actions have no GPUI carrier in this projection'],
    [Boolean(ir.textOverflow), 'textOverflow', 'text-overflow', 'declared truncation policy has no GPUI text runtime'],
  ];
  for (const [present, kind, rule, fallback] of topLevel) {
    if (present) omit(state, { kind, source: 'contract', ...boundaryReason(boundary, rule, fallback) });
  }

  const plan: GpuiPlan = {
    channel: undefined,
    part: undefined,
    valueMethod: undefined,
    defaultMethod: undefined,
    disabledMethod,
    mixedProp: undefined,
    axes,
    boolProps,
    textProps,
    childContent,
    refs,
    callbacks,
    activations,
    slots: realizedSlots,
    slotVariants,
    defaultValue: 'false',
    disabledDefault: 'false',
    keys: [],
    excludedProps: omittedProps,
    omissions: state.omissions,
  };
  return { ir: transformed, plan, omissions: state.omissions };
}

/**
 * Tolerant style plan for the generic anatomy projection.
 *
 * Same cascade shape as the bounded planner, but a declaration this target
 * cannot resolve is a named omission instead of a generation failure: the
 * component still mounts with the rest of its authored style.
 */
export function gpuiAnatomyStylePlan(ir: ComponentIR): GpuiStylePlan {
  const omissions: GpuiStyleOmission[] = [];
  if (!ir.nativeStyleRules) {
    omissions.push({ sourceKey: 'styles', reason: 'contract declares no native style facts', boundary: 'styles', disposition: 'refused' });
    return { rules: [], omissions };
  }
  omissions.push(...ir.nativeStyleRules.unsupported.map(source => ({ sourceKey: source.sourceKey, reason: source.reason, boundary: 'styles' })));
  const admittedPredicates = new Set(['variant','checked','disabled','indeterminate','hover','active','focus']);
  const rules: GpuiStylePlan['rules'] = [];
  for (const rule of ir.nativeStyleRules.rules) {
    const unsupported = rule.predicates.find(predicate => !admittedPredicates.has(predicate.kind));
    if (unsupported) {
      for (const declaration of rule.declarations) omissions.push({ sourceKey: rule.sourceKey, property: declaration.property, reason: `predicate ${unsupported.kind} has no admitted GPUI state carrier`, boundary: 'states' });
      continue;
    }
    if (rule.predicates.some(predicate => 'ownerPart' in predicate && predicate.ownerPart && !['root', ir.formControl?.part.name].includes(predicate.ownerPart))) {
      for (const declaration of rule.declarations) omissions.push({ sourceKey: rule.sourceKey, property: declaration.property, reason: 'predicate owner has no admitted native event carrier', boundary: 'states' });
      continue;
    }
    const declarations = rule.declarations.flatMap(declaration => {
      if (declaration.property.includes('.')) return [declaration];
      if (!supported.has(declaration.property)) {
        omissions.push({ sourceKey: rule.sourceKey, property: declaration.property, reason: 'property outside GPUI admitted style vocabulary', boundary: 'styles' });
        return [];
      }
      if (declaration.value.includes('var(') || declaration.value.includes('calc(') || declaration.value.includes('clamp(')) {
        omissions.push({ sourceKey: rule.sourceKey, property: declaration.property, reason: 'expression has no normalized scalar realization', boundary: 'styles' });
        return [];
      }
      if (!validScalar(declaration, !!rule.pseudo)) {
        omissions.push({ sourceKey: rule.sourceKey, property: declaration.property, reason: `value ${declaration.value} is outside the admitted scalar vocabulary`, boundary: 'styles' });
        return [];
      }
      return declaration.designSlot
        ? [{ property: declaration.designSlot, value: declaration.value, ...(declaration.token ? { token: declaration.token } : {}) }, { ...declaration, token: declaration.designSlot }]
        : [declaration];
    });
    if (declarations.length || rule.declarations.some(declaration => declaration.property.includes('.'))) rules.push({ ...rule, declarations });
  }
  return { rules, omissions };
}
