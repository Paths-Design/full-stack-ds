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
 * A leaf no rule matches is UNCLASSIFIED and fails generation for every
 * component. A leaf that only a `catchAll` rule matches is UNADJUDICATED and
 * fails generation for an allowlisted component: widening the allowlist or
 * adding a prop to an admitted contract forces an explicit decision.
 */
import fs from "node:fs";
import path from "node:path";
import type { ComponentContract } from "../../contract.js";
import { findComponentStyles, findComponentTokens, listComponentContracts } from "../../contracts-fs.js";
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
  /** A family-level fallback; an allowlisted component may not rely on it. */
  catchAll?: boolean;
  /** lowered: how the claim is checked against the emitted control. */
  realizes?: Realization;
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
}

export interface ClassifiedLeaf extends Leaf {
  rule: string | null;
  disposition: BoundaryDisposition | "unclassified";
  catchAll: boolean;
}

const escape = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

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

function ruleMatches(rule: BoundaryRule, leaf: Leaf): boolean {
  if (rule.valueIn && !rule.valueIn.some(v => Object.is(v, leaf.value))) return false;
  if (rule.valuePattern !== undefined) {
    if (typeof leaf.value !== "string") return false;
    let re = valuePatterns.get(rule.valuePattern);
    if (!re) {
      re = new RegExp(rule.valuePattern);
      valuePatterns.set(rule.valuePattern, re);
    }
    if (!re.test(leaf.value)) return false;
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
export function classifyLeaf(leaf: Leaf, boundary: Boundary = loadBoundary()): ClassifiedLeaf {
  const rule = boundary.rules.find(r => ruleMatches(r, leaf));
  return rule
    ? { ...leaf, rule: rule.id, disposition: rule.disposition, catchAll: rule.catchAll === true }
    : { ...leaf, rule: null, disposition: "unclassified", catchAll: false };
}

export type ContractWithSidecars = ComponentContract & { tokens?: unknown; styles?: unknown };

/** Leaves of a contract plus its merged `tokens`/`styles` sidecars. */
export function contractLeaves(contract: ContractWithSidecars): Leaf[] {
  const { tokens, styles, ...body } = contract;
  const roles = propRoles(contract);
  return [
    ...keyedLeaves(body, "contract", roles),
    ...keyedLeaves(tokens, "tokens"),
    ...keyedLeaves(styles, "styles"),
  ];
}

export function classifyContract(contract: ContractWithSidecars, boundary: Boundary = loadBoundary()): ClassifiedLeaf[] {
  return contractLeaves(contract).map(leaf => classifyLeaf(leaf, boundary));
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
