/** Build-side fixture projection. This module must not enter the browser graph. */
import ts from "typescript";
import type { AuthoredPropType, ComponentContract } from "./contract.js";

export type PreviewValue = string | number | boolean | null | PreviewValue[] | { [key: string]: PreviewValue };
export interface PreviewPropSamples {
  values: Record<string, PreviewValue>;
  /** Unsupported required inputs remain absent, rather than receiving a fake object. */
  unsupported: Record<string, string>;
}
type Sample = { ok: true; value: PreviewValue } | { ok: false; reason: string };
const value = (input: PreviewValue): Sample => ({ ok: true, value: input });
const unsupported = (reason: string): Sample => ({ ok: false, reason });
const unsafeKey = (key: string) => ["__proto__", "constructor", "prototype"].includes(key);

/** Only data is constructed: type syntax is parsed, never evaluated. */
export function derivePreviewPropSamples(contract: ComponentContract): PreviewPropSamples {
  const choose = (choices: (() => Sample)[]): Sample => {
    for (const choice of choices) {
      const result = choice();
      if (result.ok) return result;
    }
    return unsupported("no JSON-constructible union member");
  };
  const named = (name: string, seen: Set<string>, depth: number): Sample => {
    if (seen.has(name)) return unsupported(`recursive alias ${name}`);
    if (depth > 64) return unsupported("type nesting exceeds preview limit");
    const definition = contract.types?.[name];
    if (!definition) return unsupported(`unknown alias ${name}`);
    if (definition.kind === "union" && definition.values?.length) return value(definition.values[0]!);
    if (definition.kind !== "alias" || !definition.alias) return unsupported(`unsupported alias ${name}`);
    return text(definition.alias, new Set([...seen, name]), depth + 1);
  };
  const node = (type: ts.TypeNode, seen: Set<string>, depth: number): Sample => {
    if (depth > 64) return unsupported("type nesting exceeds preview limit");
    if (type.kind === ts.SyntaxKind.StringKeyword) return value("Example");
    if (type.kind === ts.SyntaxKind.NumberKeyword) return value(0);
    if (type.kind === ts.SyntaxKind.BooleanKeyword) return value(false);
    if (ts.isParenthesizedTypeNode(type)) return node(type.type, seen, depth + 1);
    if (ts.isArrayTypeNode(type)) return value([]);
    if (ts.isUnionTypeNode(type)) return choose(type.types.map(member => () => node(member, new Set(seen), depth + 1)));
    if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName) && !type.typeArguments?.length) {
      return named(type.typeName.text, seen, depth + 1);
    }
    if (ts.isLiteralTypeNode(type)) {
      const literal = type.literal;
      if (ts.isStringLiteral(literal)) return value(literal.text);
      if (literal.kind === ts.SyntaxKind.NullKeyword) return value(null);
      if (literal.kind === ts.SyntaxKind.TrueKeyword) return value(true);
      if (literal.kind === ts.SyntaxKind.FalseKeyword) return value(false);
      if (ts.isNumericLiteral(literal)) {
        const number = Number(literal.text);
        return Number.isFinite(number) ? value(number) : unsupported("non-finite JSON number");
      }
      if (ts.isPrefixUnaryExpression(literal) && literal.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(literal.operand)) {
        const number = -Number(literal.operand.text);
        return Number.isFinite(number) ? value(number) : unsupported("non-finite JSON number");
      }
    }
    if (ts.isTypeLiteralNode(type)) {
      const fields = new Map<string, PreviewValue>();
      const names = new Set<string>();
      for (const member of type.members) {
        if (!ts.isPropertySignature(member) || !member.type ||
            !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))) {
          return unsupported("object requires property-only members");
        }
        const key = member.name.text;
        if (unsafeKey(key) || names.has(key)) return unsupported(`ambiguous object key ${key}`);
        names.add(key);
        if (member.questionToken) continue;
        const result = node(member.type, new Set(seen), depth + 1);
        if (!result.ok) return unsupported(`${key}: ${result.reason}`);
        fields.set(key, result.value);
      }
      return value(Object.fromEntries(fields));
    }
    return unsupported(`unsupported type syntax ${ts.SyntaxKind[type.kind]}`);
  };
  const text = (source: string, seen: Set<string>, depth: number): Sample => {
    const file = ts.createSourceFile("preview-type.ts", `type PreviewInput = ${source};`, ts.ScriptTarget.Latest, true);
    const diagnostics = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
    const statement = file.statements[0];
    if (diagnostics.length || file.statements.length !== 1 || !statement || !ts.isTypeAliasDeclaration(statement)) {
      return unsupported("malformed type expression");
    }
    return node(statement.type, seen, depth);
  };
  const authored = (type: AuthoredPropType, seen = new Set<string>(), depth = 0): Sample => {
    if (depth > 64) return unsupported("type nesting exceeds preview limit");
    switch (type.kind) {
      case "string": return value("Example");
      case "number": return value(0);
      case "boolean": return value(false);
      case "literal": return value(type.value);
      case "enum": return type.values.length ? value(type.values[0]!) : unsupported("empty enum");
      case "array": return value([]);
      case "union": return choose(type.of.map(member => () => authored(member, new Set(seen), depth + 1)));
      case "ref": return named(type.to, seen, depth + 1);
      default: return unsupported(`non-JSON prop kind ${type.kind}`);
    }
  };
  const values = new Map<string, PreviewValue>();
  const failures = new Map<string, string>();
  const members = ["styled", "designed", "constrained"].flatMap(bucket => contract.props?.[bucket]?.members ?? []);
  for (const member of members) {
    if (!member.required || member.default !== undefined || member.defaultMessage !== undefined || contract.variants?.[member.name]?.length) continue;
    const result = unsafeKey(member.name) ? unsupported("unsafe prop key")
      : member.propType ? authored(member.propType)
      : member.type ? text(member.type, new Set(), 0) : unsupported("missing prop type");
    if (result.ok) values.set(member.name, result.value);
    else failures.set(member.name, result.reason);
  }
  return { values: Object.fromEntries(values), unsupported: Object.fromEntries(failures) };
}
