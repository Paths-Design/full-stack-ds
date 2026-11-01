/**
 * GPUI support boundary.
 *
 * The committed `support-boundary.json` classifies every contract and sidecar
 * leaf the GPUI target can see into exactly one disposition:
 *
 *   lowered — the GPUI projection realises the fact in the generated view tree,
 *             control state, retained content/slot surface or painted style
 *             vocabulary (`via` names the mechanism);
 *   pending — semantically meaningful, but the shared GPUI substrate does not
 *             realise it yet (`reason` says what is missing);
 *   substrate — the capability has no channel in the pinned GPUI revision at
 *             all (`reason` names the missing capability and its evidence, so
 *             the gap is a stated non-claim rather than pending work);
 *   refused — the fact has no native meaning for an engine target, or is
 *             authoring/CSS-only metadata (`reason` says why).
 *
 * Rules match pointer FAMILIES, never component identities. Leaves are keyed
 * JSON pointers: array elements that carry a `name`/`part` identity are keyed
 * by it, anatomy nodes that render another component are keyed `ref:<part>`,
 * and prop members are additionally keyed by the role the contract's own
 * `channels` and `form` blocks assign to them (channel-value:checked,
 * form-field:name, plain:disabled, …). That derivation is the only
 * contract-wide reasoning here; everything else is a pointer match.
 *
 * Rules are ordered: first match wins. The ledger ends with an explicit
 * catch-all whose disposition is `refused` with `catchAll: true`, so a leaf
 * that belongs to no adjudicated family is never silently supported. The audit
 * treats catch-all reliance on an admitted component as a violation: widening
 * the allowlist or adding a prop to an admitted contract forces an explicit
 * decision.
 *
 * Dispositions state what the TARGET realises for the corpus, not what one
 * bounded planner happens to support. The bounded control/static planners can
 * realise more for a specific shape (a boolean channel, a hover state); the
 * generic anatomy projection is the fallback that must account for every other
 * fact, and it names each fact it cannot realise in that component's
 * capability receipt. The receipt, not the ledger, is the per-component truth.
 *
 * The `styles` sidecar declaration is classified by property family and by
 * selector family (platform-restriction and design-slot metadata under a
 * declaration are their own refused families). Value-level adjudication
 * (calc, currentColor, keyword values) is not modelled: a declaration family
 * is classified whole, which is what the target's property whitelist consumes.
 */
import fs from "node:fs";
import path from "node:path";
import type { ComponentContract } from "../../contract.js";
import { findComponentStyles, findComponentTokens, listComponentContracts } from "../../contracts-fs.js";
import boundaryJson from "./support-boundary.json" with { type: "json" };

export type GpuiDisposition = "lowered" | "pending" | "substrate" | "refused";
export type GpuiLeafSource = "contract" | "tokens" | "styles";

export interface GpuiBoundaryRule {
  id: string;
  /** Patterns `<source>:<keyed pointer>`; `*` matches within one segment, a whole `**` segment matches any depth. */
  match: string[];
  disposition: GpuiDisposition;
  /** lowered: the mechanism that realises the family. */
  via?: string;
  /** pending/refused: what is missing, or why the fact has no native meaning. */
  reason?: string;
  /** The terminal refused rule for leaves outside every adjudicated family. */
  catchAll?: boolean;
}

export interface GpuiBoundary {
  schema: "gpui-support-boundary.v1";
  /** Optional phase labels for pending families, keyed by phase id. */
  phases?: Record<string, string>;
  rules: GpuiBoundaryRule[];
}

export interface Leaf {
  source: GpuiLeafSource;
  /** RFC 6901 pointer into the source document. */
  pointer: string;
  /** RFC 6901 pointer with identity-bearing segments keyed; this is what rules match. */
  keyed: string;
  value: unknown;
}

export interface ClassifiedLeaf extends Leaf {
  rule: string | null;
  disposition: GpuiDisposition | "unclassified";
  catchAll: boolean;
}

/** One classified leaf as `classifyContract` reports it. */
export interface ContractLeafDisposition {
  pointer: string;
  source: GpuiLeafSource;
  disposition: GpuiDisposition;
  rule: string;
  catchAll: boolean;
}

/** RFC 6901 escaping of one pointer segment. */
export const escape = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

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
  // A glyph lookup's name prop is a distinct role from form serialization or
  // ordinary content. Derive it from authored anatomy so a plain `name` on
  // another component does not acquire glyph support by spelling alone.
  type GlyphNode = { iconGlyph?: { nameFrom?: string }; children?: GlyphNode[] };
  const visit = (node: GlyphNode | undefined): void => {
    const match = /^prop:([A-Za-z_$][\w$-]*)$/.exec(node?.iconGlyph?.nameFrom ?? "");
    if (match && !roles.has(match[1]!)) roles.set(match[1]!, "glyph-name");
    for (const child of node?.children ?? []) visit(child);
  };
  visit((contract as { anatomy?: { dom?: GlyphNode } }).anatomy?.dom);
  // Host fact: root anchor activation, independent of callback spelling.
  const anchor = Array.isArray(contract.anatomy) ? undefined : contract.anatomy?.dom;
  const activation = anchor?.tag === "a" ? anchor.events?.click : undefined;
  const callback = typeof activation === "string" ? /^prop:([A-Za-z_$][\w$-]*)$/.exec(activation) : undefined;
  if (callback) roles.set(callback[1]!, "anchor-activation");
  return roles;
}

function walk(value: unknown, source: GpuiLeafSource, pointer: string, keyed: string, roles: Map<string, string>, out: Leaf[]): void {
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
      // Preserve the raw source pointer while classifying the host capability.
      const anchorEvent = keyed === "/anatomy/dom/events" && key === "click" && typeof child === "string"
        && child.startsWith("prop:") && roles.get(child.slice(5)) === "anchor-activation";
      walk(child, source, `${pointer}/${escape(key)}`, `${keyed}/${escape(anchorEvent ? "anchor-activation" : key)}`, roles, out);
    }
    return;
  }
  out.push({ source, pointer, keyed, value });
}

/** Every leaf of one source document with identity-keyed pointers. */
export function keyedLeaves(value: unknown, source: GpuiLeafSource, roles: Map<string, string> = new Map()): Leaf[] {
  const out: Leaf[] = [];
  if (value === undefined) return out;
  walk(value, source, "", "", roles, out);
  return out;
}

// Cache syntax, never classification results: values and rule order are live inputs.
const segmentPatterns = new Map<string, RegExp>();
const pointerPatterns = new Map<string, string[]>();

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
  if (colon < 0) throw new Error(`GPUI_BOUNDARY_PATTERN: missing source prefix in ${pattern}`);
  if (pattern.slice(0, colon) !== leaf.source) return false;
  const glob = pattern.slice(colon + 1);
  if (!glob.startsWith("/")) throw new Error(`GPUI_BOUNDARY_PATTERN: pointer must start with / in ${pattern}`);
  let segments = pointerPatterns.get(glob);
  if (!segments) {
    segments = glob.slice(1).split("/");
    pointerPatterns.set(glob, segments);
  }
  return segmentsMatch(segments, leaf.keyed.slice(1).split("/"));
}

function ruleMatches(rule: GpuiBoundaryRule, leaf: Leaf): boolean {
  return rule.match.some(pattern => patternMatches(pattern, leaf));
}

const RULE_KEYS = new Set(["id", "match", "disposition", "via", "reason", "catchAll"]);

/** Structural validation of a boundary document. Throws on the first defect. */
export function validateBoundary(doc: unknown): GpuiBoundary {
  const boundary = doc as Partial<GpuiBoundary>;
  if (!boundary || boundary.schema !== "gpui-support-boundary.v1" || !Array.isArray(boundary.rules)) {
    throw new Error("GPUI_BOUNDARY_INVALID: expected { schema: 'gpui-support-boundary.v1', rules: [] }");
  }
  if (boundary.phases !== undefined) {
    if (!boundary.phases || typeof boundary.phases !== "object" || Array.isArray(boundary.phases))
      throw new Error("GPUI_BOUNDARY_INVALID: phases must be an object of phase id to description");
    for (const [phase, description] of Object.entries(boundary.phases)) {
      if (!/^[A-Za-z0-9-]+$/.test(phase)) throw new Error(`GPUI_BOUNDARY_INVALID: phase ${JSON.stringify(phase)} must be alphanumeric/kebab-case`);
      if (typeof description !== "string" || !description.trim()) throw new Error(`GPUI_BOUNDARY_INVALID: phase ${JSON.stringify(phase)} needs a non-empty description`);
    }
  }
  if (boundary.rules.length === 0) throw new Error("GPUI_BOUNDARY_INVALID: rules must not be empty");
  const ids = new Set<string>();
  const catchAlls: number[] = [];
  for (const [index, rule] of (boundary.rules as Partial<GpuiBoundaryRule>[]).entries()) {
    const where = `rule ${JSON.stringify(rule.id ?? "<missing id>")}`;
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) throw new Error(`GPUI_BOUNDARY_INVALID: rule ${index} must be an object`);
    for (const key of Object.keys(rule)) if (!RULE_KEYS.has(key)) throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: unknown member ${key}`);
    if (typeof rule.id !== "string" || !/^[a-z0-9-]+$/.test(rule.id)) throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: id must be kebab-case`);
    if (ids.has(rule.id)) throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: duplicate id`);
    ids.add(rule.id);
    if (!Array.isArray(rule.match) || rule.match.length === 0 || rule.match.some(m => typeof m !== "string" || !m))
      throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: match must be a non-empty string array`);
    for (const pattern of rule.match) {
      const colon = pattern.indexOf(":");
      const source = colon < 0 ? "" : pattern.slice(0, colon);
      if (!["contract", "tokens", "styles"].includes(source))
        throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: pattern ${pattern} needs a contract:/tokens:/styles: prefix`);
      if (!pattern.slice(colon + 1).startsWith("/"))
        throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: pattern ${pattern} must carry a pointer starting with /`);
      patternMatches(pattern, { source: source as GpuiLeafSource, keyed: "/" });
    }
    if (rule.catchAll !== undefined && typeof rule.catchAll !== "boolean")
      throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: catchAll must be a boolean`);
    if (rule.catchAll) {
      if (rule.disposition !== "refused")
        throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: only a refused rule may be the catch-all (an unadjudicated family must not be supported)`);
      catchAlls.push(index);
    }
    if (rule.disposition === "lowered") {
      if (typeof rule.via !== "string" || !rule.via.trim()) throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: lowered rules name their mechanism in via`);
    } else if (rule.disposition === "pending" || rule.disposition === "substrate" || rule.disposition === "refused") {
      if (typeof rule.reason !== "string" || !rule.reason.trim()) throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: ${rule.disposition} rules carry a reason`);
    } else {
      throw new Error(`GPUI_BOUNDARY_INVALID: ${where}: disposition must be lowered, pending, substrate or refused`);
    }
  }
  if (catchAlls.length > 1) throw new Error(`GPUI_BOUNDARY_INVALID: at most one catch-all rule is allowed, found ${catchAlls.length}`);
  if (catchAlls.length === 1 && catchAlls[0] !== boundary.rules.length - 1)
    throw new Error("GPUI_BOUNDARY_INVALID: the catch-all rule must be the terminal rule");
  return boundary as GpuiBoundary;
}

let cached: GpuiBoundary | undefined;
export function loadBoundary(): GpuiBoundary {
  cached ??= validateBoundary(boundaryJson);
  return cached;
}

/** First matching rule wins; rule order in the file is authoritative. */
export function classifyLeaf(leaf: Leaf, boundary: GpuiBoundary = loadBoundary()): ClassifiedLeaf {
  const rule = boundary.rules.find(candidate => ruleMatches(candidate, leaf));
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

/** Every leaf of one contract classified, including any that match no rule. */
export function classifyLeaves(contract: ContractWithSidecars, boundary: GpuiBoundary = loadBoundary()): ClassifiedLeaf[] {
  return contractLeaves(contract).map(leaf => classifyLeaf(leaf, boundary));
}

const describe = (leaves: ClassifiedLeaf[]): string =>
  leaves.slice(0, 5).map(leaf => `${leaf.source}:${leaf.keyed}`).join(", ") + (leaves.length > 5 ? ` (+${leaves.length - 5} more)` : "");

/**
 * Classify every leaf of one contract (contract + tokens + styles). Throws
 * `GPUI_BOUNDARY_UNCLASSIFIED` if the boundary misses a leaf family, so this
 * entry point is only usable against a total ledger; `classifyLeaves` exposes
 * the partial view the audit reports.
 */
export function classifyContract(contract: ContractWithSidecars, boundary: GpuiBoundary = loadBoundary()): ContractLeafDisposition[] {
  const classified = classifyLeaves(contract, boundary);
  const unclassified = classified.filter(leaf => leaf.disposition === "unclassified");
  if (unclassified.length) throw new Error(`GPUI_BOUNDARY_UNCLASSIFIED: ${contract.name}: ${describe(unclassified)}`);
  return classified.map(leaf => ({
    pointer: leaf.keyed,
    source: leaf.source,
    disposition: leaf.disposition as GpuiDisposition,
    rule: leaf.rule!,
    catchAll: leaf.catchAll,
  }));
}

/** One audit finding on an admitted contract. */
export interface GpuiBoundaryViolation {
  pointer: string;
  source: GpuiLeafSource;
  rule: string | null;
  kind: "unclassified" | "catch-all";
}

/**
 * Audit one contract against the ledger. A leaf that matches no adjudicated
 * family is a violation, and so is reliance on the terminal catch-all: the
 * catch-all exists so a total ledger can be validated, not so an admitted
 * component can silently inherit an unadjudicated fact.
 */
export function auditContract(contract: ContractWithSidecars, boundary: GpuiBoundary = loadBoundary()): GpuiBoundaryViolation[] {
  const violations: GpuiBoundaryViolation[] = [];
  for (const leaf of classifyLeaves(contract, boundary)) {
    if (leaf.disposition === "unclassified") violations.push({ pointer: leaf.keyed, source: leaf.source, rule: null, kind: "unclassified" });
    else if (leaf.catchAll) violations.push({ pointer: leaf.keyed, source: leaf.source, rule: leaf.rule, kind: "catch-all" });
  }
  return violations;
}

/**
 * Classify one contract prop by its contract pointer `/props/<name>`.
 *
 * `role` narrows the family to the role the contract assigns the prop
 * (channel-value, channel-default, channel-change, form-field, glyph-name);
 * without it the name-level family default is returned. The same prop name can
 * carry different roles on different contracts (`name` is a form field on
 * Switch, a displayed name on Avatar and a glyph lookup on Icon), so callers
 * that know the role should pass it; `classifyContract` is authoritative for
 * the role-qualified leaves of one contract.
 */
export function classifyProp(boundary: GpuiBoundary, prop: string, role?: string): { disposition: GpuiDisposition; rule: string; via?: string; reason?: string; catchAll: boolean } {
  if (typeof prop !== "string" || !prop.trim()) throw new Error("GPUI_BOUNDARY_PROP: prop must be a non-empty string");
  const name = escape(prop);
  const keyed = role ? `/props/designed/members/${escape(role)}:${name}/name` : `/props/${name}`;
  const rule = boundary.rules.find(candidate => ruleMatches(candidate, { source: "contract", pointer: keyed, keyed, value: prop }));
  if (!rule) throw new Error(`GPUI_BOUNDARY_UNCLASSIFIED_PROP: ${prop}${role ? ` (${role})` : ""}`);
  return {
    disposition: rule.disposition,
    rule: rule.id,
    ...(rule.via ? { via: rule.via } : {}),
    ...(rule.reason ? { reason: rule.reason } : {}),
    catchAll: rule.catchAll === true,
  };
}

/** Read one contract and its sidecars the way the CLI presents them to emitters. */
export function loadContractWithSidecars(root: string, name: string): ContractWithSidecars {
  const entry = listComponentContracts(path.join(root, "packages/ds-contracts")).find(candidate => candidate.name === name);
  if (!entry) throw new Error(`GPUI_BOUNDARY_UNKNOWN_COMPONENT: ${name}`);
  const contract = JSON.parse(fs.readFileSync(entry.absPath, "utf8")) as ContractWithSidecars;
  const tokens = findComponentTokens(entry);
  const styles = findComponentStyles(entry);
  if (tokens) contract.tokens = JSON.parse(fs.readFileSync(tokens.absPath, "utf8"));
  if (styles) contract.styles = JSON.parse(fs.readFileSync(styles.absPath, "utf8"));
  return contract;
}

/** The GPUI allowlist the target registry declares. */
export function gpuiAllowlist(root: string): string[] {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "fsds.targets.json"), "utf8")) as { targets: { id: string; components?: string[] }[] };
  const target = registry.targets.find(candidate => candidate.id === "gpui");
  if (!target?.components) throw new Error("GPUI_BOUNDARY_ALLOWLIST_REQUIRED");
  return target.components;
}
