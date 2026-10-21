/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — lower `contract.relationships[]` into
 * typed IR facts so generated components actually WIRE the id references the
 * contract declares, instead of carrying them as prose.
 *
 * Scope of the lowering (everything else stays a rail-visible gap):
 *   - Only idref attributes with a settled emitter story are lowered:
 *     `for`, `aria-labelledby`, `aria-describedby`.
 *   - Both parts must resolve to rendered dom nodes. A relationship naming a
 *     part the dom tree never renders (ToggleSwitch's historical
 *     input→label) is a contract overclaim — it is skipped here and stays
 *     unrealized on the a11y-realization rail until the contract is fixed.
 *   - Neither part may sit inside an iteration (a per-item id scheme is not
 *     modeled yet).
 *   - A `from` node that already carries the attribute (static attr, or a
 *     non-prop binding) realizes the relationship by other means — skipped,
 *     never double-emitted. A plain `prop:` binding on the attribute is
 *     FOLDED into the generated attribute as `passthroughProp` (the consumer
 *     escape hatch stays, e.g. TextField's `ariaDescribedby`).
 *
 * Routing: when the relationship's semantic element is consumer-slotted
 * (Field's control slot), direct attribute emission is impossible — a `for`
 * must reference a labelable element, not the slot's wrapper. Those
 * relationships produce a `FieldAssociationProviderIR` instead: the composer
 * provides the generated control id + describedby ids through each
 * framework's ambient-context idiom, and controls that declare
 * `fieldAssociation: "control"` consume them. Lit emits neither side — its
 * components render into shadow roots and idrefs cannot cross the shadow
 * boundary (tracked as a platform limitation in the a11y rail ledger).
 */

import type { ComponentContract } from "./contract.js";
import type {
  ComponentIR,
  DomNodeIR,
  FieldAssociationProviderIR,
  IdRefAttrIR,
  IdRefConditionIR,
  IdRefIR,
} from "./ir.js";

/** Idref attributes with a lowering; everything else is left to its own slice. */
export const LOWERED_RELATIONSHIP_ATTRIBUTES: ReadonlySet<string> = new Set([
  "for",
  "aria-labelledby",
  "aria-describedby",
  // aria-controls lowers via the SAME owned-pair path as aria-describedby
  // (id on target, idref on source): Details' summary controls its content
  // region. Unlike native <details> disclosure (which the user agent owns),
  // the summary's aria-controls idref is an explicit enhancement AT screen
  // readers use to announce the controlled region — realizable, not native.
  "aria-controls",
]);

interface PartOccurrence {
  node: DomNodeIR;
  inIteration: boolean;
}

function collectPartOccurrences(dom: DomNodeIR): Map<string, PartOccurrence> {
  const byPart = new Map<string, PartOccurrence>();
  const walk = (node: DomNodeIR, inIteration: boolean) => {
    const iterating = inIteration || node.iteration !== undefined;
    if (node.part && !byPart.has(node.part)) {
      byPart.set(node.part, { node, inIteration: iterating });
    }
    for (const child of node.children) walk(child, iterating);
  };
  walk(dom, false);
  return byPart;
}

function collectSlotNames(dom: DomNodeIR): Set<string> {
  const names = new Set<string>();
  const walk = (node: DomNodeIR) => {
    if (node.tag === "slot" && node.slotName) names.add(node.slotName);
    for (const child of node.children) walk(child);
  };
  walk(dom);
  return names;
}

/** A part's element "hosts a slot" when consumer content IS its semantic body. */
function hostsSlot(node: DomNodeIR): boolean {
  return (
    node.tag === "slot" ||
    (node.children.length === 1 && node.children[0].tag === "slot")
  );
}

type WhenResolution =
  | { ok: true; cond: IdRefConditionIR | undefined; slotGate?: string }
  | { ok: false };

/** The named slot that IS a part-node's semantic content, if any. */
function targetSlotName(node: DomNodeIR): string | undefined {
  if (node.tag === "slot") return node.slotName;
  return node.children.find((child) => child.tag === "slot")?.slotName;
}

/**
 * Resolve a `relationships[].when` clause against the component's prop and
 * slot surfaces. Grammar: `<name>=<value>` / `<name>!=<value>`.
 *
 *   - `<slot>=present` — a slot-presence clause, lowered as a `slotGate`
 *     (see IdRefIR.slotGate for the per-framework capability story).
 *   - `<prop>=true` / `<prop>=present` — truthiness of the prop.
 *   - `<prop>=false` — negated truthiness (`!=` flips either form).
 *   - `<prop>=<literal>` — string equality against the prop value.
 *
 * A clause that does not parse, or names neither a prop nor a slot, makes
 * the relationship unlowerable ({ok:false}) — it stays a rail-visible gap
 * rather than guessing at semantics.
 */
function resolveWhenClause(
  when: string | undefined,
  propNames: ReadonlySet<string>,
  slotNames: ReadonlySet<string>,
): WhenResolution {
  if (when === undefined) return { ok: true, cond: undefined };
  const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*(!?=)\s*([A-Za-z0-9_-]+)$/.exec(
    when.trim(),
  );
  if (!match) return { ok: false };
  const [, name, op, value] = match;
  const negated = op === "!=";
  if (slotNames.has(name) && value === "present" && !negated) {
    return { ok: true, cond: undefined, slotGate: name };
  }
  if (!propNames.has(name)) return { ok: false };
  if (value === "true" || value === "present") {
    return { ok: true, cond: { prop: name, op: "truthy", negated } };
  }
  if (value === "false") {
    return { ok: true, cond: { prop: name, op: "truthy", negated: !negated } };
  }
  return { ok: true, cond: { prop: name, op: "eq", value, negated } };
}

function pushIdRef(node: DomNodeIR, attribute: string, ref: IdRefIR): void {
  let entry: IdRefAttrIR | undefined = node.idRefAttrs.find(
    (a) => a.attribute === attribute,
  );
  if (!entry) {
    entry = { attribute, refs: [] };
    node.idRefAttrs.push(entry);
  }
  entry.refs.push(ref);
}

/**
 * Prepare the from-node's existing surface for a generated idref attribute.
 * Returns the passthrough prop when the attribute was bound as a plain
 * `prop:` (binding removed — the generated attribute absorbs it), `null`
 * when nothing was bound, and `false` when the attribute is already
 * realized by other means (static attr / non-prop binding) so the
 * relationship must be skipped rather than double-emitted.
 */
function claimAttribute(
  node: DomNodeIR,
  attribute: string,
): string | null | false {
  const existingEntry = node.idRefAttrs.find((a) => a.attribute === attribute);
  if (existingEntry) return existingEntry.passthroughProp ?? null;
  if (node.attrs[attribute] !== undefined) return false;
  const binding = node.bindings[attribute];
  if (binding === undefined) return null;
  if (binding.kind === "prop" && (!binding.path || binding.path.length === 0)) {
    delete node.bindings[attribute];
    return binding.prop;
  }
  return false;
}

/**
 * Resolve every lowerable relationship, mutating the dom tree in place
 * (`generatedIdSlug` on targets, `idRefAttrs` on sources) and returning the
 * field-association provider facts when any relationship routes through a
 * consumer slot. Never throws for unlowerable relationships — those remain
 * visible as unrealized obligations on the a11y-realization rail, which is
 * the loud signal for contract drift.
 */
export function resolveIdRelationships(
  dom: DomNodeIR,
  contract: ComponentContract,
  propNames: ReadonlySet<string>,
): FieldAssociationProviderIR | undefined {
  const relationships = contract.relationships ?? [];
  if (relationships.length === 0) return undefined;

  const byPart = collectPartOccurrences(dom);
  const slotNames = collectSlotNames(dom);
  const channelByValueProp = new Map(
    Object.entries(contract.channels ?? {}).map(([name, channel]) => [channel.value, name]),
  );
  /** A gate on a channel's value prop reads the channel, as an `if` guard does. */
  const onChannel = (cond: IdRefConditionIR | undefined): IdRefConditionIR | undefined => {
    const channel = cond && channelByValueProp.get(cond.prop);
    return channel ? { ...cond, channel } : cond;
  };
  let provider: FieldAssociationProviderIR | undefined;

  for (const rel of relationships) {
    if (!LOWERED_RELATIONSHIP_ATTRIBUTES.has(rel.attribute)) continue;
    const from = byPart.get(rel.from);
    const to = byPart.get(rel.to);
    if (!from || !to) continue; // part never rendered — contract overclaim
    if (from.inIteration || to.inIteration) continue; // per-item ids not modeled
    const clause = resolveWhenClause(rel.when, propNames, slotNames);
    if (!clause.ok) continue;
    const resolved = { ...clause, cond: onChannel(clause.cond) };

    if (rel.attribute === "for" && hostsSlot(to.node)) {
      // Slotted control: its id is delivered via field association; the
      // label element still binds `for` to the same generated id directly.
      const passthrough = claimAttribute(from.node, rel.attribute);
      if (passthrough === false) continue;
      provider = provider ?? { controlSlug: rel.to, describedBy: [] };
      provider.controlSlug = rel.to;
      pushIdRef(from.node, rel.attribute, {
        slug: rel.to,
        when: resolved.cond,
      });
      if (passthrough !== null) {
        from.node.idRefAttrs.find(
          (a) => a.attribute === rel.attribute,
        )!.passthroughProp = passthrough;
      }
      continue;
    }

    if (hostsSlot(from.node)) {
      // The ATTRIBUTE-carrying element is consumer-slotted. Only
      // aria-describedby delivery through field association is modeled.
      if (rel.attribute !== "aria-describedby") continue;
      to.node.generatedIdSlug = rel.to;
      provider = provider ?? { controlSlug: rel.from, describedBy: [] };
      provider.describedBy.push({
        slug: rel.to,
        when: resolved.cond,
        slotGate: resolved.slotGate ?? targetSlotName(to.node),
      });
      continue;
    }

    // Owned pair: id on the target element, idref attribute on the source.
    const passthrough = claimAttribute(from.node, rel.attribute);
    if (passthrough === false) continue;
    to.node.generatedIdSlug = rel.to;
    // An explicit when-clause wins; otherwise inherit the target's own
    // render guard so the idref never points at an element the guard
    // removed (Toast's title `if: "title"`).
    const gate: IdRefConditionIR | undefined =
      resolved.cond ??
      onChannel(
        to.node.ifProp && !to.node.ifNegated
          ? { prop: to.node.ifProp, op: "truthy", negated: false }
          : undefined,
      );
    pushIdRef(from.node, rel.attribute, {
      slug: rel.to,
      when: gate,
      // A naming/description IDREF should disappear with empty consumer
      // content; aria-controls still points at a live target even when that
      // target's slot is empty (Command's empty listbox is the canonical
      // case). Do not let a target slot silently gate structural IDREFs.
      slotGate:
        resolved.slotGate ??
        (rel.attribute === "aria-labelledby" ||
        rel.attribute === "aria-describedby"
          ? targetSlotName(to.node)
          : undefined),
    });
    if (passthrough !== null) {
      const entry = from.node.idRefAttrs.find(
        (a) => a.attribute === rel.attribute,
      )!;
      entry.passthroughProp = passthrough;
    }
  }

  return provider;
}

/**
 * True when the component's generated source needs a per-instance id
 * (React/Vue `useId`, Svelte `$props.id()`, Angular module counter). Lit
 * never does — its ids are shadow-root-scoped literals.
 */
export function componentNeedsInstanceId(ir: ComponentIR): boolean {
  if (ir.fieldAssociation?.provides) return true;
  if (!ir.dom) return false;
  const stack: DomNodeIR[] = [ir.dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.generatedIdSlug !== undefined || node.idRefAttrs.length > 0) {
      return true;
    }
    stack.push(...node.children);
  }
  return false;
}
