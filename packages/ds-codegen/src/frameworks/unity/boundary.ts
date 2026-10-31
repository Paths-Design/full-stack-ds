/**
 * Unity support boundary.
 *
 * The committed `support-boundary.json` classifies every contract and sidecar
 * leaf the Unity target can see into exactly one disposition:
 *
 *   lowered  — the emitter or the shared C# runtime realises the fact today
 *              (`via` names the mechanism);
 *   pending  — a later parity phase lowers it (`phase` names which);
 *   refused  — UI Toolkit cannot realise it idiomatically (`reason` says why).
 *
 * Rules match pointer FAMILIES, never component identities. Leaves are keyed
 * JSON pointers: array elements that carry a `name`/`part` identity are keyed
 * by it, anatomy nodes that render another component are keyed
 * `ref:<part>`, and prop members are additionally keyed by the role the contract's
 * own `channels` and `form` blocks assign to them (channel-value:checked,
 * form-field:name, plain:disabled, …). That derivation is the only
 * contract-wide reasoning here; everything else is a pointer match.
 *
 * A tokens/styles rule may also condition on the sidecar DECLARATION a leaf
 * belongs to (one token entry, or one property of one styles block): its
 * value (`literal`, else `fallback`) and, for styles, whether the IR's native
 * style grammar admits the block's selector key. Every leaf of a declaration
 * therefore classifies alike, which a per-leaf `valueIn`/`valuePattern`
 * cannot do (`resolvesTo`, `platforms` and `design` leaves carry no value).
 *
 * A leaf no rule matches is UNCLASSIFIED and fails generation for every
 * component. A leaf that only a `catchAll` rule matches is UNADJUDICATED and
 * fails generation for an allowlisted component: widening the allowlist or
 * adding a prop to an admitted contract forces an explicit decision.
 */
import fs from "node:fs";
import path from "node:path";
import type { ComponentContract } from "../../contract.js";
import { findComponentStyles, findComponentTokens, listComponentContracts } from "../../contracts-fs.js";
import { buildComponentIR } from "../../ir.js";
import boundaryJson from "./support-boundary.json" with { type: "json" };

export type BoundaryDisposition = "lowered" | "pending" | "refused";
export type LeafSource = "contract" | "tokens" | "styles";
export const PHASES = ["P2", "P3", "P4", "P5"] as const;
export type Phase = (typeof PHASES)[number];
/**
 * How a `lowered` rule's claim is checked against the control the emitter
 * actually produces for a component (see factory.ts assertRealized):
 *   emitted-property        the prop member is a generated public property;
 *   selected-channel        the channel is the one the dispatcher selected;
 *   selected-channel-member the prop is that channel's value/default/change prop;
 *   channel-change-event    the event is emitted via that channel's change prop;
 *   selected-channel-binding an anatomy binding to the selected channel's value
 *                           sits on a trigger part (the behavior's state class);
 *   bound-prop-property     an anatomy `prop:<p>` binding on a trigger part names
 *                           a prop the root class emits as a public property.
 * A lowered leaf whose realization fails refuses generation
 * (UNITY_BOUNDARY_UNREALIZED) instead of being silently dropped.
 */
export const REALIZATIONS = ["emitted-property", "selected-channel", "selected-channel-member", "channel-change-event", "selected-channel-binding", "bound-prop-property"] as const;
export type Realization = (typeof REALIZATIONS)[number];

export interface BoundaryRule {
  id: string;
  /** Patterns `<source>:<keyed pointer>`; `*` matches within one segment, a whole `**` segment matches any depth. */
  match: string[];
  disposition: BoundaryDisposition;
  /** lowered: the emitter/runtime mechanism that realises the family. */
  via?: string;
  /** pending: the parity phase that lowers the family. */
  phase?: Phase;
  /** pending/refused: why. */
  reason?: string;
  /** Only leaves whose value is one of these match (scalar leaves only). */
  valueIn?: (string | number | boolean | null)[];
  /** Only string leaves whose value matches this regular expression match. */
  valuePattern?: string;
  /** tokens/styles only: conditions on the declaration the leaf belongs to. */
  declaration?: DeclarationCondition;
  /**
   * Applies only when the contract declares a leaf satisfying one of these
   * conditions. Disambiguates prop families the keyed pointer alone cannot
   * separate, without naming a component.
   */
  requiresAny?: RequirementCondition[];
  /** A family-level fallback; an allowlisted component may not rely on it. */
  catchAll?: boolean;
  /** lowered: how the claim is checked against the emitted control. */
  realizes?: Realization;
}

export interface DeclarationCondition {
  /** The declaration's value (`literal`, else `fallback`, as a string) matches this regular expression. */
  valuePattern?: string;
  /** styles only: whether the IR's native style grammar admits the block's selector key. */
  nativeGrammar?: boolean;
}

/** One contract-level precondition for a rule's `requiresAny` list. */
export interface RequirementCondition {
  /** Patterns `<source>:<keyed pointer>` evaluated against the whole contract. */
  match: string[];
  /** Only candidate leaves whose value is one of these satisfy the condition. */
  valueIn?: (string | number | boolean | null)[];
  /** Only string candidate leaves whose value matches this regular expression satisfy the condition. */
  valuePattern?: string;
}

export interface Boundary {
  schema: string;
  rules: BoundaryRule[];
}

export interface Leaf {
  source: LeafSource;
  /** RFC 6901 pointer into the source document. */
  pointer: string;
  /** Identity-keyed pointer the rules match against. */
  keyed: string;
  value: unknown;
  /** tokens/styles: the declaration the leaf belongs to. */
  declaration?: LeafDeclaration;
}

export interface LeafDeclaration {
  /** The token path, or the styles block's selector key. */
  key: string;
  /** `literal`, else `fallback`, as a string; absent for a styles block with no property. */
  value?: string;
  /** styles: whether the IR's native style grammar admits `key`. */
  nativeGrammar?: boolean;
}

export interface ClassifiedLeaf extends Leaf {
  rule: string | null;
  disposition: BoundaryDisposition | "unclassified";
  catchAll: boolean;
}

/** RFC 6901 escaping of one pointer segment. */
export const escape = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");
const unescape = (segment: string): string => segment.replace(/~1/g, "/").replace(/~0/g, "~");

/** Prop roles the contract itself assigns: channel trio membership and form fields. */
export function propRoles(contract: ComponentContract): Map<string, string> {
  const roles = new Map<string, string>();
  const channels = (contract as { channels?: Record<string, Record<string, unknown>> }).channels ?? {};
  for (const channel of Object.values(channels)) {
    if (typeof channel.value === "string") roles.set(channel.value, "channel-value");
    if (typeof channel.defaultValue === "string") roles.set(channel.defaultValue, "channel-default");
    if (typeof channel.onChange === "string") roles.set(channel.onChange, "channel-change");
  }
  const form = (contract as { form?: { participates?: boolean; name?: { prop?: string }; serialization?: { valueSource?: string } } }).form;
  if (form?.participates) {
    const explicit = [form.name?.prop, form.serialization?.valueSource?.startsWith("prop:") ? form.serialization.valueSource.slice(5) : undefined];
    for (const prop of [...explicit, "name", "value"]) if (prop && !roles.has(prop)) roles.set(prop, "form-field");
  }
  // A glyph lookup's name prop is a distinct role from form serialization.
  // Derive it from authored anatomy so a plain `name` on another component
  // does not acquire glyph support by spelling alone.
  type GlyphNode = { iconGlyph?: { nameFrom?: string }; children?: GlyphNode[] };
  const visit = (node: GlyphNode | undefined): void => {
    const match = /^prop:([A-Za-z_$][\w$-]*)$/.exec(node?.iconGlyph?.nameFrom ?? "");
    if (match && !roles.has(match[1]!)) roles.set(match[1]!, "glyph-name");
    for (const child of node?.children ?? []) visit(child);
  };
  visit((contract as { anatomy?: { dom?: GlyphNode } }).anatomy?.dom);
  return roles;
}

function walk(value: unknown, source: LeafSource, pointer: string, keyed: string, roles: Map<string, string>, out: Leaf[]): void {
  if (Array.isArray(value) && value.length) {
    value.forEach((item, index) => {
      const identity = item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : null;
      let key = String(index);
      if (identity && typeof identity.componentRef === "string") {
        // Anatomy nodes that render another component are keyed `ref:<part>`
        // so their attrs and bindings classify as by-reference composition,
        // not as facts of a native element.
        key = `ref:${escape(typeof identity.part === "string" ? identity.part : String(index))}`;
      } else if (identity && typeof identity.name === "string") {
        const role = keyed.endsWith("/members") ? `${roles.get(identity.name) ?? "plain"}:` : "";
        key = `${role}${escape(identity.name)}`;
      } else if (identity && typeof identity.part === "string") {
        key = escape(identity.part);
      }
      walk(item, source, `${pointer}/${index}`, `${keyed}/${key}`, roles, out);
    });
    return;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length) {
    for (const [key, child] of Object.entries(value)) {
      walk(child, source, `${pointer}/${escape(key)}`, `${keyed}/${escape(key)}`, roles, out);
    }
    return;
  }
  out.push({ source, pointer, keyed, value });
}

/** Every leaf of one source document with identity-keyed pointers. */
export function keyedLeaves(value: unknown, source: LeafSource, roles: Map<string, string> = new Map()): Leaf[] {
  const out: Leaf[] = [];
  if (value === undefined) return out;
  walk(value, source, "", "", roles, out);
  return out;
}

// Cache syntax, never classification results: values and rule order are live inputs.
const segmentPatterns = new Map<string, RegExp>();
const pointerPatterns = new Map<string, string[]>();
const valuePatterns = new Map<string, RegExp>();

function segmentMatches(pattern: string, segment: string): boolean {
  if (!pattern.includes("*")) return pattern === segment;
  let re = segmentPatterns.get(pattern);
  if (!re) {
    re = new RegExp(`^${pattern.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`);
    segmentPatterns.set(pattern, re);
  }
  return re.test(segment);
}

function segmentsMatch(pattern: string[], segments: string[], p = 0, s = 0): boolean {
  if (p === pattern.length) return s === segments.length;
  const head = pattern[p];
  if (head === "**") {
    for (let skip = s; skip <= segments.length; skip++) if (segmentsMatch(pattern, segments, p + 1, skip)) return true;
    return false;
  }
  if (s === segments.length) return false;
  return segmentMatches(head!, segments[s]!) && segmentsMatch(pattern, segments, p + 1, s + 1);
}

/** `<source>:<keyed pointer glob>` against a leaf. */
export function patternMatches(pattern: string, leaf: Pick<Leaf, "source" | "keyed">): boolean {
  const colon = pattern.indexOf(":");
  if (colon < 0) throw new Error(`UNITY_BOUNDARY_PATTERN: missing source prefix in ${pattern}`);
  if (pattern.slice(0, colon) !== leaf.source) return false;
  const glob = pattern.slice(colon + 1);
  if (!glob.startsWith("/")) throw new Error(`UNITY_BOUNDARY_PATTERN: pointer must start with / in ${pattern}`);
  let segments = pointerPatterns.get(glob);
  if (!segments) {
    segments = glob.slice(1).split("/");
    pointerPatterns.set(glob, segments);
  }
  return segmentsMatch(segments, leaf.keyed.slice(1).split("/"));
}

/** The scalar value tests a rule or a requirement condition declares. */
function valueTest(condition: { valueIn?: (string | number | boolean | null)[]; valuePattern?: string }, leaf: Leaf): boolean {
  if (condition.valueIn && !condition.valueIn.some(v => Object.is(v, leaf.value))) return false;
  if (condition.valuePattern !== undefined) {
    if (typeof leaf.value !== "string") return false;
    let re = valuePatterns.get(condition.valuePattern);
    if (!re) {
      re = new RegExp(condition.valuePattern);
      valuePatterns.set(condition.valuePattern, re);
    }
    if (!re.test(leaf.value)) return false;
  }
  return true;
}

/**
 * A rule applies when its pointer family matches AND, when it declares
 * `requiresAny`, some contract leaf satisfies one listed precondition. The
 * precondition is evaluated against the whole contract so a family rule can
 * distinguish facts the identity-keyed pointer collapses (a DOM button
 * `type` versus an item group selection `type`) without component identity.
 */
function ruleMatches(rule: BoundaryRule, leaf: Leaf, contractLeaves?: readonly Leaf[]): boolean {
  // Cheap pointer test first: a precondition scan is only worth doing for the
  // leaves this rule's family can match.
  if (!rule.match.some(pattern => patternMatches(pattern, leaf))) return false;
  if (rule.requiresAny) {
    const leaves = contractLeaves ?? [];
    const applies = rule.requiresAny.some(condition =>
      leaves.some(candidate => condition.match.some(pattern => patternMatches(pattern, candidate)) && valueTest(condition, candidate)));
    if (!applies) return false;
  }
  if (!valueTest(rule, leaf)) return false;
  if (rule.declaration) {
    const declaration = leaf.declaration;
    if (!declaration) return false;
    const { valuePattern, nativeGrammar } = rule.declaration;
    if (valuePattern !== undefined && (declaration.value === undefined || !new RegExp(valuePattern).test(declaration.value))) return false;
    if (nativeGrammar !== undefined && declaration.nativeGrammar !== nativeGrammar) return false;
  }
  return rule.match.some(pattern => patternMatches(pattern, leaf));
}

/** Structural validation of a boundary document. Throws on the first defect. */
export function validateBoundary(boundary: unknown): Boundary {
  const doc = boundary as Partial<Boundary>;
  if (!doc || doc.schema !== "unity-support-boundary.v1" || !Array.isArray(doc.rules)) {
    throw new Error("UNITY_BOUNDARY_INVALID: expected { schema: 'unity-support-boundary.v1', rules: [] }");
  }
  const ids = new Set<string>();
  for (const rule of doc.rules as Partial<BoundaryRule>[]) {
    const where = `rule ${JSON.stringify(rule.id ?? "<missing id>")}`;
    if (typeof rule.id !== "string" || !/^[a-z0-9-]+$/.test(rule.id)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: id must be kebab-case`);
    if (ids.has(rule.id)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: duplicate id`);
    ids.add(rule.id);
    if (!Array.isArray(rule.match) || rule.match.length === 0 || rule.match.some(m => typeof m !== "string")) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: match must be a non-empty string array`);
    for (const pattern of rule.match) {
      const source = pattern.slice(0, pattern.indexOf(":"));
      if (!["contract", "tokens", "styles"].includes(source)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: pattern ${pattern} needs a contract:/tokens:/styles: prefix`);
      patternMatches(pattern, { source: source as LeafSource, keyed: "/" });
    }
    if (rule.disposition === "lowered") {
      if (typeof rule.via !== "string" || !rule.via.trim()) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: lowered rules name their mechanism in via`);
      if (rule.catchAll) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: a lowered rule cannot be a catch-all`);
    } else if (rule.disposition === "pending") {
      if (!PHASES.includes(rule.phase as Phase)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: pending rules name a phase (${PHASES.join(", ")})`);
      if (typeof rule.reason !== "string" || !rule.reason.trim()) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: pending rules carry a reason`);
    } else if (rule.disposition === "refused") {
      if (typeof rule.reason !== "string" || !rule.reason.trim()) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: refused rules carry a reason`);
      if (rule.catchAll) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: a refused rule cannot be a catch-all`);
    } else {
      throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: disposition must be lowered, pending or refused`);
    }
    if (rule.valueIn !== undefined && (!Array.isArray(rule.valueIn) || rule.valueIn.length === 0)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: valueIn must be a non-empty array`);
    if (rule.valuePattern !== undefined) {
      if (typeof rule.valuePattern !== "string" || !rule.valuePattern) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: valuePattern must be a non-empty regular expression`);
      try { new RegExp(rule.valuePattern); } catch { throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: valuePattern ${JSON.stringify(rule.valuePattern)} is not a valid regular expression`); }
    }
    if (rule.requiresAny !== undefined) {
      if (!Array.isArray(rule.requiresAny) || rule.requiresAny.length === 0) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny must be a non-empty array`);
      for (const raw of rule.requiresAny as unknown[]) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny entries must be objects`);
        const condition = raw as Partial<RequirementCondition> & Record<string, unknown>;
        const keys = Object.keys(condition);
        if (keys.some(k => k !== "match" && k !== "valueIn" && k !== "valuePattern")) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny takes match, valueIn and valuePattern`);
        const patterns = condition.match;
        if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some(m => typeof m !== "string" || !m.startsWith("contract:/")))
          throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny.match must be a non-empty contract:/ pattern array`);
        for (const pattern of patterns) patternMatches(pattern, { source: "contract", keyed: "/" });
        if (condition.valueIn !== undefined && (!Array.isArray(condition.valueIn) || condition.valueIn.length === 0))
          throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny.valueIn must be a non-empty array`);
        if (condition.valuePattern !== undefined) {
          if (typeof condition.valuePattern !== "string" || !condition.valuePattern) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny.valuePattern must be a non-empty regular expression`);
          try { new RegExp(condition.valuePattern); } catch { throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: requiresAny.valuePattern ${JSON.stringify(condition.valuePattern)} is not a valid regular expression`); }
        }
      }
    }
    if (rule.declaration !== undefined) {
      const condition = rule.declaration as Record<string, unknown> | null;
      if (!condition || typeof condition !== "object" || Array.isArray(condition)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration must be an object`);
      const keys = Object.keys(condition);
      if (!keys.length || keys.some(k => k !== "valuePattern" && k !== "nativeGrammar")) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration takes valuePattern and/or nativeGrammar`);
      if (rule.match.some(m => !m.startsWith("tokens:") && !m.startsWith("styles:"))) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration conditions apply to tokens: and styles: patterns only`);
      if (condition.valuePattern !== undefined) {
        if (typeof condition.valuePattern !== "string" || !condition.valuePattern) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration.valuePattern must be a non-empty regular expression`);
        try { new RegExp(condition.valuePattern); } catch { throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration.valuePattern ${JSON.stringify(condition.valuePattern)} is not a valid regular expression`); }
      }
      if (condition.nativeGrammar !== undefined) {
        if (typeof condition.nativeGrammar !== "boolean") throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration.nativeGrammar must be a boolean`);
        if (rule.match.some(m => !m.startsWith("styles:"))) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: declaration.nativeGrammar applies to styles: patterns only`);
      }
    }
    if (rule.realizes !== undefined) {
      if (rule.disposition !== "lowered") throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: only lowered rules declare realizes`);
      if (!REALIZATIONS.includes(rule.realizes)) throw new Error(`UNITY_BOUNDARY_INVALID: ${where}: realizes must be one of ${REALIZATIONS.join(", ")}`);
    }
  }
  return doc as Boundary;
}

let cached: Boundary | undefined;
export function loadBoundary(): Boundary {
  cached ??= validateBoundary(boundaryJson);
  return cached;
}

/** First matching rule wins; rule order in the file is authoritative. */
export function classifyLeaf(leaf: Leaf, boundary: Boundary = loadBoundary(), contractLeaves?: readonly Leaf[]): ClassifiedLeaf {
  const rule = boundary.rules.find(r => ruleMatches(r, leaf, contractLeaves));
  return rule
    ? { ...leaf, rule: rule.id, disposition: rule.disposition, catchAll: rule.catchAll === true }
    : { ...leaf, rule: null, disposition: "unclassified", catchAll: false };
}

export type ContractWithSidecars = ComponentContract & { tokens?: unknown; styles?: unknown };

const declarationValue = (entry: unknown): string | undefined => {
  if (entry === null || typeof entry !== "object") return entry === undefined ? undefined : String(entry);
  const { literal, fallback } = entry as { literal?: unknown; fallback?: unknown };
  const value = literal ?? fallback;
  return value === undefined || value === null ? undefined : String(value);
};

/** Styles selector keys the IR's native style grammar refuses (no NativeStyleRuleIR exists for them). */
function nativeGrammarRefusals(contract: ContractWithSidecars): Set<string> {
  let ir: ReturnType<typeof buildComponentIR>;
  try {
    ir = buildComponentIR(contract);
  } catch (error) {
    throw new Error(`UNITY_BOUNDARY_IR: ${contract.name}: the styles sidecar is classified against the IR's native style grammar, and the IR does not build: ${error instanceof Error ? error.message : String(error)}`);
  }
  return new Set((ir.nativeStyleRules?.unsupported ?? []).map(u => u.sourceKey));
}

/** Leaves of a contract plus its merged `tokens`/`styles` sidecars. */
export function contractLeaves(contract: ContractWithSidecars): Leaf[] {
  const { tokens, styles, ...body } = contract;
  const roles = propRoles(contract);
  const segments = (leaf: Leaf) => leaf.pointer.slice(1).split("/").map(unescape);
  const tokenLeaves = keyedLeaves(tokens, "tokens").map(leaf => {
    const [key] = segments(leaf);
    if (key === undefined || key === "") return leaf;
    return { ...leaf, declaration: { key, value: declarationValue((tokens as Record<string, unknown>)[key]) } };
  });
  const styleLeaves = keyedLeaves(styles, "styles");
  const refused = styleLeaves.length ? nativeGrammarRefusals(contract) : new Set<string>();
  return [
    ...keyedLeaves(body, "contract", roles),
    ...tokenLeaves,
    ...styleLeaves.map(leaf => {
      const [key, property] = segments(leaf);
      if (key === undefined || key === "") return leaf;
      const block = (styles as Record<string, Record<string, unknown> | undefined>)[key];
      const value = property === undefined ? undefined : declarationValue(block?.[property]);
      return { ...leaf, declaration: { key, ...(value === undefined ? {} : { value }), nativeGrammar: !refused.has(key) } };
    }),
  ];
}

export function classifyContract(contract: ContractWithSidecars, boundary: Boundary = loadBoundary()): ClassifiedLeaf[] {
  const leaves = contractLeaves(contract);
  return leaves.map(leaf => classifyLeaf(leaf, boundary, leaves));
}

const describe = (leaves: ClassifiedLeaf[]): string =>
  leaves.slice(0, 5).map(l => `${l.source}:${l.keyed}${l.rule ? ` (rule ${l.rule})` : ""}`).join(", ") + (leaves.length > 5 ? ` (+${leaves.length - 5} more)` : "");

/**
 * Generation gate. Throws UNITY_BOUNDARY_UNCLASSIFIED for any leaf without a
 * rule, and UNITY_BOUNDARY_UNADJUDICATED when an allowlisted component relies
 * on a catch-all rule.
 */
export function admitContract(contract: ContractWithSidecars, context: { admitted: boolean }, boundary: Boundary = loadBoundary()): ClassifiedLeaf[] {
  const classified = classifyContract(contract, boundary);
  const unclassified = classified.filter(l => l.disposition === "unclassified");
  if (unclassified.length) throw new Error(`UNITY_BOUNDARY_UNCLASSIFIED: ${contract.name}: ${describe(unclassified)}`);
  if (context.admitted) {
    const unadjudicated = classified.filter(l => l.catchAll);
    if (unadjudicated.length) throw new Error(`UNITY_BOUNDARY_UNADJUDICATED: ${contract.name} is allowlisted but relies on catch-all rules: ${describe(unadjudicated)}`);
  }
  return classified;
}

export interface BoundaryAudit {
  counts: Record<BoundaryDisposition | "unclassified", number>;
  perPhase: Record<string, number>;
  unclassified: { component: string; leaf: string }[];
  unadjudicated: { component: string; leaf: string; rule: string }[];
  deadRules: string[];
  violations: string[];
}

/** Read one contract and its sidecars the way the CLI presents them to emitters (minus box-model defaults). */
export function loadContractWithSidecars(root: string, name: string): ContractWithSidecars {
  const entry = listComponentContracts(path.join(root, "packages/ds-contracts")).find(e => e.name === name);
  if (!entry) throw new Error(`UNITY_BOUNDARY_UNKNOWN_COMPONENT: ${name}`);
  const contract = JSON.parse(fs.readFileSync(entry.absPath, "utf8")) as ContractWithSidecars;
  const tokens = findComponentTokens(entry);
  const styles = findComponentStyles(entry);
  if (tokens) contract.tokens = JSON.parse(fs.readFileSync(tokens.absPath, "utf8"));
  if (styles) contract.styles = JSON.parse(fs.readFileSync(styles.absPath, "utf8"));
  return contract;
}

export function unityAllowlist(root: string): string[] {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "fsds.targets.json"), "utf8")) as { targets: { id: string; components?: string[] }[] };
  const target = registry.targets.find(t => t.id === "unity");
  if (!target?.components) throw new Error("UNITY_BOUNDARY_ALLOWLIST_REQUIRED");
  return target.components;
}

/** Corpus-wide audit: zero unclassified, no admitted catch-all reliance, no dead rules. */
export function auditBoundary(root: string, boundary: Boundary = loadBoundary()): BoundaryAudit {
  const admitted = new Set(unityAllowlist(root));
  const entries = listComponentContracts(path.join(root, "packages/ds-contracts"));
  if (!entries.length) throw new Error("UNITY_BOUNDARY_EMPTY_CORPUS");
  const audit: BoundaryAudit = {
    counts: { lowered: 0, pending: 0, refused: 0, unclassified: 0 },
    perPhase: {},
    unclassified: [],
    unadjudicated: [],
    deadRules: [],
    violations: [],
  };
  const used = new Set<string>();
  for (const entry of entries) {
    const contract = loadContractWithSidecars(root, entry.name);
    for (const leaf of classifyContract(contract, boundary)) {
      audit.counts[leaf.disposition]++;
      if (leaf.rule) used.add(leaf.rule);
      if (leaf.disposition === "pending") {
        const phase = boundary.rules.find(r => r.id === leaf.rule)!.phase!;
        audit.perPhase[phase] = (audit.perPhase[phase] ?? 0) + 1;
      }
      if (leaf.disposition === "unclassified") audit.unclassified.push({ component: entry.name, leaf: `${leaf.source}:${leaf.keyed}` });
      if (leaf.catchAll && admitted.has(entry.name)) audit.unadjudicated.push({ component: entry.name, leaf: `${leaf.source}:${leaf.keyed}`, rule: leaf.rule! });
    }
  }
  audit.deadRules = boundary.rules.filter(r => !used.has(r.id)).map(r => r.id);
  for (const u of audit.unclassified) audit.violations.push(`unclassified ${u.component} ${u.leaf}`);
  for (const u of audit.unadjudicated) audit.violations.push(`unadjudicated ${u.component} ${u.leaf} (catch-all ${u.rule})`);
  for (const id of audit.deadRules) audit.violations.push(`dead rule ${id} matches no live leaf`);
  return audit;
}
