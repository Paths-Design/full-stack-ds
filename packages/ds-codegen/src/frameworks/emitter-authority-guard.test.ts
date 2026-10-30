/**
 * Emitter authority guard — the mechanical enforcement of
 * docs/codegen-authority.md over the two native emitter trees.
 *
 * The authority doc's review checklist ("look for hardcoded component
 * names, hardcoded prop names that only make sense for one component,
 * framework-local tables that duplicate semantic facts") has lived as prose
 * since CODEGEN-SEMANTIC-AUTHORITY-01. This test runs it as a scanner:
 *
 * 1. COMPONENT IDENTITY — no emitter may branch on `ir.name` against a
 *    literal. Ever. No exemption path.
 * 2. INLINE PROP QUERIES — no emitter may key `styledProps` queries on
 *    name/safeName string literals; conventional-prop lookups route through
 *    the substrate vocabulary (native-emission-class.ts, the single
 *    sanctioned home for name-keyed queries, each documented with the
 *    classification fields).
 * 3. TOKEN-NAMESPACE SNIFFING — `tokenScopes` query bodies may not compare
 *    value names against string literals; namespace prefixes are declared
 *    constants in jetpack-compose/kotlin/grammar.ts (the declared
 *    grammar-table home) or carried as declared IR facts.
 * 4. CHANNEL-NAME KEYING — `normalizedChannels` queries may key on channel
 *    KIND (valueType), not on name literals; the conventional expansion
 *    vocabulary lives in the substrate (expansionChannel(s)).
 * 5. RATCHET — the substrate's exported inventory is frozen below. Adding
 *    a predicate (a new singleton shape-proxy = component identity by
 *    structural proxy) or a vocabulary query requires an explicit, reviewed
 *    edit to FROZEN_SUBSTRATE_INVENTORY; the durable fix for a singleton
 *    predicate is a declared IR fact (the dateGrid / transfer /
 *    surface-kind precedent), which SHRINKS this list.
 *
 * Escape hatch: a `GUARD-ADMITTED(axis: <axis>, removal: <SPEC-ID>)`
 * comment on the preceding line admits that line only, and the marker
 * itself is validated (the axis must be one the authority doc allows, the
 * removal must cite a spec-shaped id) — the mechanical form of the doc's
 * temporary-exception protocol.
 *
 * Residual (honest): call sites may pass literal names INTO the vocabulary
 * functions (`hasConventionalProp(ir, "steps")`) — that is sanctioned
 * vocabulary usage; the guard holds the line at inline query bodies.
 * react-native is not yet in scan scope (its lore was lowered under
 * CODEGEN-RN-EMITTER-IR-AUTHORITY-01; extending the scan is follow-up).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));

const SCAN_ROOTS = [
  join(HERE, "jetpack-compose"),
  join(HERE, "swift/swiftui"),
];

function tsFilesUnder(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Extract the balanced-paren argument of `receiver.(fn)(` starting at the
 *  index of `(`. Returns the argument text (outer parens excluded). */
function parenArg(text: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return text.slice(openIdx + 1); // unbalanced (malformed) — take the rest
}

const NAME_QUOTED_LITERAL =
  /(?:\bname|\bsafeName)\s*(?:===|!==)\s*(?:"[^"]*"|'[^']*')/;
const NAME_PREFIX_QUOTED_LITERAL =
  /(?:\bname|\bsafeName)\s*\.\s*(?:startsWith|includes)\(\s*(?:"[^"]*"|'[^']*')/;
const NAME_TEMPLATE = /((?:\bname|\bsafeName)\s*(?:===|!==)\s*`)([^`]*)`/g;
const NAME_PREFIX_TEMPLATE =
  /((?:\bname|\bsafeName)\s*\.\s*(?:startsWith|includes)\(\s*`)([^`]*)`/g;

/** True when the body keys a name/safeName against literal text. Quoted
 *  strings always count; template literals count only when their STATIC
 *  text (outside ${...} interpolations) carries letters or digits — a
 *  template like `${NAMESPACE_PREFIX}${value}` is declared vocabulary,
 *  while `${PREFIX}.cell.` smuggles literal namespace through the static
 *  fragments. */
function nameKeyedLiteral(body: string, includePrefixForms: boolean): boolean {
  if (NAME_QUOTED_LITERAL.test(body)) return true;
  if (includePrefixForms && NAME_PREFIX_QUOTED_LITERAL.test(body)) return true;
  const staticText = (template: string): string =>
    template.replace(/\$\{[^}]*\}/g, "");
  const templates = [...body.matchAll(NAME_TEMPLATE)].map((m) => staticText(m[2]!));
  if (includePrefixForms) {
    templates.push(...[...body.matchAll(NAME_PREFIX_TEMPLATE)].map((m) => staticText(m[2]!)));
  }
  return templates.some((text) => /[A-Za-z0-9]/.test(text));
}

const IR_NAME_IDENTITY =
  /\bir\.name\s*(?:===|!==)\s*(?:"[^"]*"|'[^']*')|\bir\.name\s*\.\s*(?:startsWith|includes)\(\s*(?:"[^"]*"|'[^']*')/;

const GUARD_ADMITTED = /GUARD_ADMITTED\s*\(\s*axis:\s*([^,]+?)\s*,\s*removal:\s*([^)]+?)\s*\)/;
const ALLOWED_AXES = new Set([
  "anatomy-part-role", "binding-kind", "channel-kind", "channel-value-type",
  "host-capability", "surface-kind", "tag", "role", "framework-grammar",
  "conventional-vocabulary",
]);

interface Violation {
  file: string;
  line: number;
  text: string;
  rule: string;
}

/** Scan one emitter source; returns violations. Pure — the self-check runs
 *  planted mutations through the same scanner the repo tree goes through. */
export function scanEmitterSource(source: string, file: string): Violation[] {
  const violations: Violation[] = [];
  const lines = source.split("\n");
  const lineAt = (charIdx: number): number =>
    source.slice(0, charIdx).split("\n").length; // 1-based line number

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (IR_NAME_IDENTITY.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim(), rule: "component-identity" });
      continue;
    }
  }

  // Query-body rules: receiver.(find|some|filter|every)( … )
  const queryRe =
    /(styledProps|tokenScopes|normalizedChannels)\s*\.\s*(?:find|some|filter|every)\s*\(/g;
  for (const match of source.matchAll(queryRe)) {
    const openIdx = match.index! + match[0].length - 1;
    const body = parenArg(source, openIdx);
    const rule =
      match[1] === "styledProps" ? "inline-prop-query" :
      match[1] === "tokenScopes" ? "token-namespace-query" :
      "channel-name-query";
    const flagged = nameKeyedLiteral(body, rule !== "channel-name-query");
    if (!flagged) continue;
    const lineNo = lineAt(match.index!);
    // GUARD-ADMITTED on the same line or the line above exempts one line.
    const line = lines[lineNo - 1] ?? "";
    const prev = lines[lineNo - 2] ?? "";
    if (line.includes("GUARD_ADMITTED") || prev.includes("GUARD_ADMITTED")) {
      const marker = GUARD_ADMITTED.exec(line) ?? GUARD_ADMITTED.exec(prev);
      if (!marker) {
        violations.push({ file, line: lineNo, text: (prev || line).trim(), rule: "malformed-guard-admission" });
      } else if (!ALLOWED_AXES.has(marker[1]!.trim()) || !/^[A-Z0-9]+(-[A-Z0-9]+)+-[0-9]+$/.test(marker[2]!.trim())) {
        violations.push({ file, line: lineNo, text: `axis=${marker[1]} removal=${marker[2]}`, rule: "invalid-guard-admission" });
      }
      continue;
    }
    const snippet = lines[lineNo - 1]?.trim() ?? body.slice(0, 80);
    violations.push({ file, line: lineNo, text: snippet, rule });
  }
  return violations;
}

/**
 * Ratchet inventory (rule 5): the substrate's exact exported surface.
 * Grow ONLY by deliberate edit, with review, citing the reason inline.
 * Shrink freely — that is the declared-IR-fact migration direction.
 */
const FROZEN_SUBSTRATE_INVENTORY: readonly string[] = [
  "collectDomSlots", "consumerContentProp", "conventionalProp",
  "countChildrenLeaves", "dateGridChrome", "domGlyph", "expansionChannel",
  "expansionChannels", "hasBooleanConventionalProp", "hasConventionalProp",
  "hasEssentialComponentInstance", "includesConventionalProp",
  "isAnchoredSurface", "isBareRuleLeaf", "isCenteredSurface",
  "isCoachmarkSurface", "isCompoundPartComposer", "isCountIteratedFieldGroup",
  "isDateGridSurface", "isGlyphHost", "isIconDecoratedContent",
  "isInteractiveComposite", "isLabeledTextControl", "isMediaLeaf",
  "isNamedSlotComposer", "isPagedNavigatorComposite", "isPagedPositionSet",
  "isPassiveTreeItem", "isProjectedChildrenAction", "isReferencedActionComposite",
  "isReferencedContentComposite", "isSelectionControl", "isSequencePager",
  "isStaticContent", "isTransferSurface", "isValueChannelControl",
  "isViewportEdgeSurface", "isVisualOnlyLeaf", "orientationEnumValues",
  "radioGroupFacts", "soleInputElement", "soleValueChannel",
  "stringConventionalProp", "surfaceStringChannel",
];

describe("emitter authority guard", () => {
  it("scans a non-empty emitter tree (guard against a silently-empty scan)", () => {
    const files = SCAN_ROOTS.flatMap(tsFilesUnder);
    expect(files.length).toBeGreaterThanOrEqual(15);
    const relative = files.map((f) => resolve(f).replace(`${resolve(HERE)}/`, ""));
    for (const must of [
      "jetpack-compose/component-source.ts",
      "jetpack-compose/emitters/controls.ts",
      "jetpack-compose/kotlin/grammar.ts",
      "swift/swiftui/component-source.ts",
      "swift/swiftui/surface-emit.ts",
    ]) {
      expect(relative, `missing scan target ${must}`).toContain(must);
    }
  });

  it("the native emitter trees carry no component-identity or inline name-keyed queries", () => {
    const violations = SCAN_ROOTS.flatMap((root) =>
      tsFilesUnder(root).flatMap((file) =>
        scanEmitterSource(readFileSync(file, "utf8"), file),
      ),
    );
    expect(
      violations,
      violations.map((v) => `${v.rule} at ${v.file}:${v.line} — ${v.text}`).join("\n"),
    ).toEqual([]);
  });

  it("the substrate inventory matches the frozen ratchet exactly", () => {
    const substrate = readFileSync(join(HERE, "native-emission-class.ts"), "utf8");
    const live = [...substrate.matchAll(/^export function ([A-Za-z]+)/gm)]
      .map((m) => m[1]!)
      .sort();
    const frozen = [...FROZEN_SUBSTRATE_INVENTORY].sort();
    expect(live).toEqual(frozen);
  });
});

describe("emitter authority guard — scanner self-check (planted violations)", () => {
  it("flags a component-identity comparison", () => {
    const v = scanEmitterSource(
      `if (ir.name === "Spinner") { return emitSpinner(ir); }`,
      "planted.ts",
    );
    expect(v).toHaveLength(1);
    expect(v[0]!.rule).toBe("component-identity");
  });

  it("flags an inline name-keyed styledProps query", () => {
    const v = scanEmitterSource(
      `const w = ir.styledProps.find((p) => p.name === "spinnerWidth" && p.propType.kind === "boolean");`,
      "planted.ts",
    );
    expect(v).toHaveLength(1);
    expect(v[0]!.rule).toBe("inline-prop-query");
  });

  it("flags token-namespace sniffing with a literal prefix", () => {
    const v = scanEmitterSource(
      `const hit = ir.tokenScopes.some((s) => s.values.some((v) => v.name.startsWith("calendar.cell.")));`,
      "planted.ts",
    );
    expect(v).toHaveLength(1);
    expect(v[0]!.rule).toBe("token-namespace-query");
  });

  it("flags channel-name keying but allows channel-kind keying", () => {
    const flagged = scanEmitterSource(
      `const ch = ir.behavior.normalizedChannels.find((c) => c.name === "expanded");`,
      "planted.ts",
    );
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.rule).toBe("channel-name-query");
    const kindOnly = scanEmitterSource(
      `const ok = ir.behavior.normalizedChannels.filter((c) => c.valueType === "boolean");`,
      "planted.ts",
    );
    expect(kindOnly).toEqual([]);
  });

  it("allows variable-keyed lookups, type checks, and vocabulary call sites", () => {
    const clean = scanEmitterSource(
      [
        `const axisProp = ir.styledProps.find((p) => p.safeName === axis);`,
        `const strings = ir.styledProps.filter((p) => p.type === "string");`,
        `const hasSteps = hasConventionalProp(ir, "steps");`,
        `const len = conventionalProp(ir, "length")?.defaultExpr ?? "6";`,
      ].join("\n"),
      "planted.ts",
    );
    expect(clean).toEqual([]);
  });

  it("allows grammar-constant token queries (declared vocabulary, not literals)", () => {
    const clean = scanEmitterSource(
      [
        `const isTypo = ir.tokenScopes.some((s) => s.values.some((v) => v.name.includes(TYPOGRAPHY_SIZE_INFIX)));`,
        `const hit = ir.tokenScopes.some((s) => s.values.some((v) => v.name.startsWith(PROGRESS_SIZE_PREFIX)));`,
        `const w = axes.find((a) => ir.tokenScopes.some((s) => s.values.some((v) => v.name === \`\${TYPOGRAPHY_WEIGHT_PREFIX}\${a.values[0]}\`)));`,
      ].join("\n"),
      "planted.ts",
    );
    expect(clean).toEqual([]);
  });

  it("flags a template that smuggles literal namespace through static fragments", () => {
    const v = scanEmitterSource(
      `const hit = ir.tokenScopes.some((s) => s.values.some((v) => v.name === \`\${PREFIX}calendar.cell.\`));`,
      "planted.ts",
    );
    expect(v).toHaveLength(1);
    expect(v[0]!.rule).toBe("token-namespace-query");
  });

  it("honours a well-formed GUARD_ADMITTED marker and rejects malformed ones", () => {
    const admitted = scanEmitterSource(
      [
        `// GUARD_ADMITTED(axis: anatomy-part-role, removal: CODEGEN-IR-PART-ROLE-01)`,
        `const t = ir.styledProps.find((p) => p.name === "toggle");`,
      ].join("\n"),
      "planted.ts",
    );
    expect(admitted).toEqual([]);
    const malformed = scanEmitterSource(
      [
        `// GUARD_ADMITTED(axis: because-i-said-so, removal: someday)`,
        `const t = ir.styledProps.find((p) => p.name === "toggle");`,
      ].join("\n"),
      "planted.ts",
    );
    expect(malformed).toHaveLength(1);
    expect(malformed[0]!.rule).toBe("invalid-guard-admission");
  });
});
