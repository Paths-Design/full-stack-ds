/** Bounded native projection of passive scalar metadata around consumer content.
 * Inputs are preformatted strings, named from their exact prop/path provenance.
 * This is not an object/media API or a native numeric-formatting policy.
 */
import ts from "typescript";
import type { BindingExpression, ComponentIR, DomNodeIR } from "./ir.js";
import { findMessage } from "./messages.js";

export interface NativeMetadataInput {
  prop: string;
  path: string[];
  name: string;
}
export type NativeMetadataLeaf =
  | { kind: "content"; parts: string[] }
  | { kind: "text"; parts: string[]; source: BindingExpression };
export interface NativeMetadataTextPlan {
  inputs: NativeMetadataInput[];
  leaves: NativeMetadataLeaf[];
  label?: BindingExpression;
}

const sourceKey = (prop: string, path: string[]) => JSON.stringify([prop, ...path]);

/** Resolve a scalar leaf through the IR's canonical type and alias table. */
function scalarType(ir: ComponentIR, type: string, path: string[], seen = new Set<string>()): boolean {
  const file = ts.createSourceFile("metadata.ts", `type Value = ${type};`, ts.ScriptTarget.Latest, true);
  const statement = file.statements[0];
  if (!statement || !ts.isTypeAliasDeclaration(statement)) return false;
  const visit = (node: ts.TypeNode, remaining: string[]): boolean => {
    if (ts.isParenthesizedTypeNode(node)) return visit(node.type, remaining);
    if (ts.isUnionTypeNode(node)) return node.types.every(member => visit(member, remaining));
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText(file);
      if (seen.has(name)) return false;
      const definition = ir.definedTypes[name];
      if (definition?.kind === "alias" && definition.alias) {
        return scalarType(ir, definition.alias, remaining, new Set([...seen, name]));
      }
      return remaining.length === 0 && definition?.kind === "union" && (definition.values?.length ?? 0) > 0;
    }
    if (remaining.length > 0) {
      if (!ts.isTypeLiteralNode(node)) return false;
      const [head, ...tail] = remaining;
      const fields = node.members.filter(member => ts.isPropertySignature(member) && member.name.getText(file) === head);
      const field = fields[0];
      return fields.length === 1 && !!field && ts.isPropertySignature(field) && !!field.type && visit(field.type, tail);
    }
    return node.kind === ts.SyntaxKind.StringKeyword || node.kind === ts.SyntaxKind.NumberKeyword ||
      (ts.isLiteralTypeNode(node) && (ts.isStringLiteral(node.literal) || ts.isNumericLiteral(node.literal)));
  };
  return visit(statement.type, path);
}

/** The exact projection input used by a binding; no name-only fallback. */
export function metadataInput(plan: NativeMetadataTextPlan, binding: BindingExpression): NativeMetadataInput {
  if (binding.kind !== "prop") throw new Error("Native metadata requires a scalar prop binding");
  const key = sourceKey(binding.prop, binding.path ?? []);
  const input = plan.inputs.find(item => sourceKey(item.prop, item.path) === key);
  if (!input) throw new Error(`Native metadata has no input for ${key}`);
  return input;
}

export function nativeMetadataTextPlan(ir: ComponentIR): NativeMetadataTextPlan | undefined {
  if (!ir.dom) return undefined;
  // Preserve existing plain body/fallback realizations; this bounded increment
  // handles structured metadata rather than replacing their owning paths.
  const hasPath = (source: BindingExpression): boolean => source.kind === "prop"
    ? (source.path?.length ?? 0) > 0
    : source.kind === "message" && source.params.some(param => hasPath(param.value));
  const candidate = (node: DomNodeIR): boolean =>
    (!!node.content && "kind" in node.content && hasPath(node.content as BindingExpression)) || node.children.some(candidate);
  if (!candidate(ir.dom)) return undefined;
  const plan: NativeMetadataTextPlan = { inputs: [], leaves: [] };
  const occupied = new Map(ir.styledProps.map(prop => [prop.safeName, sourceKey(prop.name, [])]));
  // The shared public scalar namespace cannot shadow a generated Swift member
  // or a Kotlin chrome local used by the text/catalog expressions below it.
  for (const name of [
    "content", "body", "modifier", "fsdsMessages", "fsdsTheme", "fsdsScopes", "nativeTextStyle",
    "layered", "colorSlot", "pxSlot", "background", "foreground", "radius", "blockPadding", "inlinePadding", "gap",
    "layeredSlot", "containerColor", "contentColor", "cornerRadius", "borderColor", "borderWidth",
    "paddingInlineStart", "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd", "minHeight",
    "shape", "chromeModifier", ...Object.keys(ir.variants ?? {}),
  ]) occupied.set(name, "native-shell");
  const fail = (reason: string): never => { throw new Error(`[NATIVE_METADATA_INVALID] ${ir.name}: ${reason}`); };
  const validate = (source: BindingExpression): void => {
    if (source.kind === "literal") return;
    if (source.kind === "message") {
      const message = findMessage(ir, source.key);
      if (new Set(source.params.map(param => param.name)).size !== source.params.length ||
          [...source.params.map(param => param.name)].sort().join(",") !== [...message.params].sort().join(",")) fail("ambiguous message parameters");
      for (const param of source.params) {
        if (param.value.kind !== "prop" && param.value.kind !== "literal") fail("message parameters must be scalar props or literals");
        validate(param.value);
      }
      return;
    }
    if (source.kind !== "prop") return fail(`unsupported ${source.kind} text binding`);
    const props = ir.styledProps.filter(prop => prop.name === source.prop);
    const path = source.path ?? [];
    if (props.length !== 1 || ![source.prop, ...path].every(part => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) ||
        !scalarType(ir, props[0]!.type, path)) fail(`non-scalar or malformed prop path ${sourceKey(source.prop, path)}`);
    const key = sourceKey(source.prop, path);
    if (plan.inputs.some(input => sourceKey(input.prop, input.path) === key)) return;
    const name = props[0]!.safeName + path.map(part => part[0]!.toUpperCase() + part.slice(1)).join("");
    const previous = occupied.get(name);
    if (previous !== undefined && previous !== key) fail(`ambiguous native input ${name}`);
    occupied.set(name, key);
    plan.inputs.push({ prop: source.prop, path: [...path], name });
  };
  const walk = (node: DomNodeIR, parents: string[]): void => {
    const parts = node.part ? [...parents, node.part] : parents;
    if (node.ifProp || node.ifSlot || node.iteration || node.componentRef || Object.keys(node.events).length > 0) fail("conditional, iterated or interactive metadata is unsupported");
    if (node.tag === "children" || node.tag === "slot") {
      if (node.slotName) fail("named content regions are unsupported");
      plan.leaves.push({ kind: "content", parts });
    } else if (node.content) {
      if (!("kind" in node.content)) fail("transformed metadata is unsupported");
      const source = node.content as BindingExpression;
      validate(source);
      plan.leaves.push({ kind: "text", parts, source });
    }
    node.children.forEach(child => walk(child, parts));
  };
  walk(ir.dom, []);
  if (plan.leaves.filter(leaf => leaf.kind === "content").length !== 1) fail("metadata requires exactly one consumer content region");
  const label = ir.dom.bindings["aria-label"];
  if (label) { validate(label); plan.label = label; }
  return plan;
}
