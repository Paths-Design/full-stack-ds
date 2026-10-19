import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { buildComponentIR, type DomNodeIR } from "../../ir.js";
import { loadBoundary, loadContractWithSidecars } from "./boundary.js";
import { ITEM_GROUP_OPTIONS } from "./walker.js";

// The shared no-component-name-lore guard only catches capitalised component
// names. The Unity walker's stronger claim (R11) is that it lowers facts, not
// names: no predicate may compare a part, channel, prop or slot identity to a
// literal from the corpus, and the only name table is the item-group option
// vocabulary the support boundary declares lowered. This guard reads the
// emitter sources as TypeScript ASTs so `node.tag === "label"` (HTML
// vocabulary) and `node.part === "label"` (lore) are told apart by subject.

const root = path.resolve(__dirname, "../../../../..");

/** Accessors whose value is a contract identity (part, channel, prop, slot or class name). */
const IDENTITY_ACCESSORS = new Set([
  "name", "part", "partName", "channel", "channelName", "prop", "propName", "slotName", "componentRef", "ref",
  "valueProp", "defaultValueProp", "changeHandlerProp", "disabledProp", "enabledByProp", "placementProp", "cssPrefix", "className",
]);

/**
 * Literals that are also corpus part/channel/slot names but which the emitter
 * uses as platform or schema vocabulary. Each must name its source and must
 * actually occur in the sources (a stale entry fails).
 */
const PLATFORM_VOCABULARY: Record<string, string> = {
  label: "HTML <label> tag on DomNodeIR.tag (label-host semantics, text-leaf tags)",
  button: "HTML <button> tag on DomNodeIR.tag / PartIR.nativeTag (Button element type)",
  toggle: "InteractionIR trigger operation enum",
  select: "InteractionIR trigger operation enum",
  selection: "ContractStateDimension.category enum",
  value: "HTML form field attribute the boundary's propRoles assigns to participating forms",
};

const DECLARED_ITEM_GROUP_VOCABULARY = ["type", "collapsible", "loop", "unmountInactive", "orientation", "activationMode", "appearance"];

function corpusVocabulary() {
  const identity = new Set<string>();
  const props = new Set<string>();
  for (const entry of listComponentContracts(path.join(root, "packages/ds-contracts"))) {
    const ir = buildComponentIR(loadContractWithSidecars(root, entry.name) as never);
    identity.add(ir.cssPrefix);
    for (const part of ir.parts) identity.add(part.name);
    for (const channel of ir.behavior.normalizedChannels) identity.add(channel.name);
    const visit = (node: DomNodeIR | undefined): void => { if (!node) return; if (node.slotName) identity.add(node.slotName); node.children.forEach(visit); };
    visit(ir.dom);
    for (const prop of ir.styledProps) props.add(prop.name);
  }
  return { identity, props };
}

const sourceFiles = fs.readdirSync(__dirname)
  .filter(name => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map(name => ({ name, text: fs.readFileSync(path.join(__dirname, name), "utf8") }));

interface Finding { file: string; line: number; text: string; literal: string }

const stringOf = (node: ts.Node): string | undefined =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;

/** The identity accessor an expression reads (`x.part`, `part`, `x.part.name`), if any. */
function identitySubject(node: ts.Expression): string | undefined {
  let expr: ts.Expression = node;
  while (ts.isParenthesizedExpression(expr) || ts.isNonNullExpression(expr) || ts.isAsExpression(expr)) expr = expr.expression;
  if (ts.isPropertyAccessExpression(expr)) return IDENTITY_ACCESSORS.has(expr.name.text) ? expr.name.text : undefined;
  if (ts.isIdentifier(expr)) return IDENTITY_ACCESSORS.has(expr.text) ? expr.text : undefined;
  return undefined;
}

/** Predicates that compare an identity accessor to a literal from `vocabulary`. */
export function identityPredicates(file: string, text: string, vocabulary: Set<string>): Finding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out: Finding[] = [];
  const report = (at: ts.Node, literal: string) => {
    if (!vocabulary.has(literal)) return;
    const { line } = source.getLineAndCharacterOfPosition(at.getStart());
    out.push({ file, line: line + 1, text: at.getText().slice(0, 120), literal });
  };
  const comparisons = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && comparisons.has(node.operatorToken.kind)) {
      const left = stringOf(node.left), right = stringOf(node.right);
      if (right !== undefined && identitySubject(node.left)) report(node, right);
      if (left !== undefined && identitySubject(node.right)) report(node, left);
    }
    if (ts.isSwitchStatement(node) && identitySubject(node.expression)) {
      for (const clause of node.caseBlock.clauses) if (ts.isCaseClause(clause)) { const lit = stringOf(clause.expression); if (lit !== undefined) report(clause, lit); }
    }
    // [..literals].includes(subject) / new Set([..literals]).has(subject)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ["includes", "has", "indexOf"].includes(node.expression.name.text) &&
        node.arguments.length && identitySubject(node.arguments[0]!)) {
      let target: ts.Expression = node.expression.expression;
      if (ts.isNewExpression(target) && target.arguments?.length) target = target.arguments[0]!;
      if (ts.isArrayLiteralExpression(target)) for (const element of target.elements) { const lit = stringOf(element); if (lit !== undefined) report(node, lit); }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** Every runtime string literal in a file, with its line (type-level literals excluded). */
function literals(file: string, text: string): Finding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out: Finding[] = [];
  const visit = (node: ts.Node): void => {
    const lit = node.parent && ts.isLiteralTypeNode(node.parent) ? undefined : stringOf(node);
    if (lit !== undefined) out.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: node.getText().slice(0, 80), literal: lit });
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

describe("Unity emitter lowers facts, not names (R11)", () => {
  const { identity, props } = corpusVocabulary();
  const names = new Set([...identity, ...props]);

  it("recognises identity predicates and ignores platform-vocabulary predicates", () => {
    const vocab = new Set(["trigger", "checked", "content", "tab", "panel", "label"]);
    const hits = (snippet: string) => identityPredicates("probe.ts", snippet, vocab).map(f => f.literal);
    expect(hits('if (node.part === "trigger") x();')).toEqual(["trigger"]);
    expect(hits('if ("checked" !== ir.formControl.channel.name) x();')).toEqual(["checked"]);
    expect(hits('const t = ["tab", "panel"].includes(part.name);')).toEqual(["tab", "panel"]);
    expect(hits('const t = new Set(["content"]).has(node.part!);')).toEqual(["content"]);
    expect(hits('switch (p.name) { case "tab": break; case "other": break; }')).toEqual(["tab"]);
    // Platform vocabulary compared on a non-identity subject is not lore.
    expect(hits('if (node.tag === "label") x(); if (dim.category === "content") y();')).toEqual([]);
  });

  it("the unity emitter sources compare no part, channel, prop or slot identity to a corpus literal", () => {
    expect(names.size).toBeGreaterThan(100);
    expect(sourceFiles.map(f => f.name).sort()).toEqual(["behaviors.ts", "boundary.ts", "capabilities.ts", "factory.ts", "walker.ts"]);
    const findings = sourceFiles.flatMap(f => identityPredicates(f.name, f.text, names));
    expect(findings).toEqual([]);
  });

  it("confines literals that are corpus part, channel or slot names to declared platform vocabulary", () => {
    const all = sourceFiles.flatMap(f => literals(f.name, f.text));
    const colliding = all.filter(f => identity.has(f.literal));
    expect(colliding.filter(f => !(f.literal in PLATFORM_VOCABULARY)).map(f => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
    // No stale allowance: every platform entry is still used.
    expect(Object.keys(PLATFORM_VOCABULARY).filter(word => !colliding.some(f => f.literal === word))).toEqual([]);
  });

  it("the emitter never reads the support boundary it is checked against", () => {
    // The boundary describes what the emitter does and assertRealized checks it
    // independently; an emitter that consulted it would make `realizes` circular.
    const imports = (text: string) => ts.createSourceFile("probe.ts", text, ts.ScriptTarget.Latest, true).statements
      .filter(ts.isImportDeclaration).map(s => (s.moduleSpecifier as ts.StringLiteral).text);
    expect(imports('import { a } from "./boundary.js";\nimport b from "./support-boundary.json";')).toEqual(["./boundary.js", "./support-boundary.json"]);
    const emitterModules = sourceFiles.filter(f => f.name === "walker.ts" || f.name === "behaviors.ts");
    expect(emitterModules).toHaveLength(2);
    for (const file of emitterModules) {
      expect(imports(file.text).filter(spec => /boundary/.test(spec)), file.name).toEqual([]);
      expect(file.text, file.name).not.toMatch(/\b(?:classifyLeaf|classifyContract|loadBoundary)\b/);
    }
  });

  it("names props only through the item-group vocabulary the boundary declares lowered", () => {
    expect(Object.keys(ITEM_GROUP_OPTIONS).sort()).toEqual([...DECLARED_ITEM_GROUP_VOCABULARY].sort());
    // The vocabulary appears as table keys only; no source spells one as a string literal.
    const spelled = sourceFiles.flatMap(f => literals(f.name, f.text)).filter(f => DECLARED_ITEM_GROUP_VOCABULARY.includes(f.literal));
    expect(spelled.map(f => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
    // The table is exactly the props the boundary's lowered item-group families name.
    const rules = loadBoundary().rules.filter(r => r.id === "prop-item-group-options" || r.id === "prop-appearance");
    expect(rules.map(r => r.disposition)).toEqual(["lowered", "lowered"]);
    const named = rules.flatMap(r => r.match.map(m => m.match(/plain:([^/]+)\//)?.[1])).filter((n): n is string => !!n);
    expect(named.sort()).toEqual([...DECLARED_ITEM_GROUP_VOCABULARY].sort());
  });
});
