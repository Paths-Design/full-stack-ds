import type { ComponentIR, DomNodeIR } from "../../../ir.js";
import type { NativeStyleDeclarationIR, NativeStyleRuleIR } from "../../../native-style-rules.js";
import { swiftLiteral } from "./icon-glyph.js";

const TEXT_PROPERTIES = new Set(["color", "font-size", "font-weight"]);

/** The default consumer region's nearest owned part, independent of its name. */
export function nativeTextPart(ir: ComponentIR): string | undefined {
  if (!ir.dom) return undefined;
  const sites: string[] = [];
  const visit = (node: DomNodeIR, owner: string): void => {
    const part = node.part ?? owner;
    if (node.tag === "children" || node.tag === "slot" && !node.slotName) sites.push(part);
    node.children.forEach((child) => visit(child, part));
  };
  visit(ir.dom, ir.dom.part ?? "root");
  return sites.length === 1 ? sites[0] : undefined;
}

export interface SwiftNativeTextRules {
  lines: string[];
  hasProperties: boolean;
  omissions: string[];
}

/** Serialize only the text property's token-definition closure. Rules retain
 * source order; the Swift runtime resolves late variant rebindings. */
export function emitSwiftNativeTextRules(ir: ComponentIR, part: string, axes: readonly string[]): SwiftNativeTextRules {
  const source = ir.nativeStyleRules;
  if (!source) throw new Error(`SWIFT_NATIVE_TEXT_RULES_MISSING: ${ir.name}`);
  const applicable = source.rules.filter((rule) => rule.part === "root" || rule.part === part);
  const platform = (declaration: NativeStyleDeclarationIR): boolean =>
    !declaration.platforms || declaration.platforms.includes("ios") || declaration.platforms.includes("macos");
  const wanted = new Set<string>();
  for (const rule of applicable) {
    for (const declaration of rule.declarations) {
      if (TEXT_PROPERTIES.has(declaration.property) && platform(declaration) && declaration.token) wanted.add(declaration.token);
    }
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const rule of applicable) for (const declaration of rule.declarations) {
      if (wanted.has(declaration.property) && declaration.token && !wanted.has(declaration.token)) {
        wanted.add(declaration.token);
        grew = true;
      }
    }
  }
  const omissions: string[] = [...source.unsupported.map((entry) => `${entry.sourceKey}: ${entry.reason}`)];
  const emitted: Array<{ rule: NativeStyleRuleIR; declarations: NativeStyleDeclarationIR[] }> = [];
  for (const rule of applicable) {
    const declarations = rule.declarations.filter((declaration) =>
      platform(declaration) && (TEXT_PROPERTIES.has(declaration.property) || wanted.has(declaration.property)),
    );
    if (declarations.length === 0) continue;
    if (rule.pseudo || rule.predicates.some((predicate) => predicate.kind !== "variant" || !axes.includes(predicate.axis))) {
      omissions.push(`${rule.sourceKey}: text rule has unsupported predicate or pseudo`);
      continue;
    }
    emitted.push({ rule, declarations });
  }
  const lines = [
    `enum ${ir.name}NativeTextRules {`,
    `    static let rules: [FsdsNativeTextRule] = [`,
  ];
  for (const { rule, declarations } of emitted) {
    const predicates = rule.predicates.map((predicate) =>
      `.init(axis: ${swiftLiteral(predicate.kind === "variant" ? predicate.axis : "")}, value: ${swiftLiteral(predicate.kind === "variant" ? predicate.value : "")})`,
    );
    const values = declarations.map((declaration) =>
      `.init(property: ${swiftLiteral(declaration.property)}, value: ${swiftLiteral(declaration.value)}` +
      `${declaration.token ? `, token: ${swiftLiteral(declaration.token)}` : ""}` +
      `${declaration.designSlot ? `, designSlot: ${swiftLiteral(declaration.designSlot)}` : ""})`,
    );
    lines.push(`        .init(part: ${swiftLiteral(rule.part)}, predicates: [${predicates.join(", ")}], declarations: [${values.join(", ")}]),`);
  }
  lines.push(`    ]`);
  lines.push(`    static let omissions: [String] = [${omissions.map(swiftLiteral).join(", ")}]`);
  lines.push(`}`);
  return { lines, hasProperties: emitted.some(({ declarations }) => declarations.some((declaration) => TEXT_PROPERTIES.has(declaration.property))), omissions };
}
