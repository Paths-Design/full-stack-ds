import type { ComponentContract, ContractMessage } from "./contract.js";
import type { BindingExpression, DomNodeIR, ResolvedPropIR } from "./ir.js";
import type { SequenceIR } from "./sequence.js";

/**
 * A translatable string owned by a component, normalized from the contract
 * `messages` block. `catalogKey` (`<Component>.<key>`) is the one name every
 * runtime catalog uses: web/RN catalogs nest it as `{ [Component]: { [key] } }`,
 * SwiftUI looks it up in the `FsdsComponents` string table, Compose reads it
 * from `LocalFsdsMessages`.
 */
export interface MessageIR {
  key: string;
  catalogKey: string;
  defaultMessage: string;
  description: string;
  /** Placeholder names, in declaration order; each appears as `{name}`. */
  params: string[];
}

/** Message-backed references the IR tracks so every declared message is used. */
export type MessageBinding = Extract<BindingExpression, { kind: "message" }>;

export function messageCatalogKey(component: string, key: string): string {
  return `${component}.${key}`;
}

/** `{name}` placeholders in source order, without duplicates. */
export function messagePlaceholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{([a-z][A-Za-z0-9]*)\}/g)].map((m) => m[1]))];
}

export function buildMessages(contract: ComponentContract): MessageIR[] {
  return Object.entries(contract.messages ?? {}).map(([key, message]: [string, ContractMessage]) => ({
    key,
    catalogKey: messageCatalogKey(contract.name, key),
    defaultMessage: message.defaultMessage,
    description: message.description,
    params: message.params ?? [],
  }));
}

/** Every message reference inside a binding, including nested operands. */
export function collectMessageBindings(expr: BindingExpression | undefined, out: MessageBinding[] = []): MessageBinding[] {
  if (!expr) return out;
  switch (expr.kind) {
    case "message":
      out.push(expr);
      break;
    case "conditional":
      collectMessageBindings(expr.condition, out);
      collectMessageBindings(expr.whenTrue, out);
      collectMessageBindings(expr.whenFalse, out);
      break;
    case "projection":
      collectMessageBindings(expr.source, out);
      if (expr.op === "selectionLabel") {
        collectMessageBindings(expr.selection, out);
        collectMessageBindings(expr.fallback, out);
      }
      break;
    case "valueMap":
      collectMessageBindings(expr.source, out);
      break;
    default:
      break;
  }
  return out;
}

/** All message bindings in a DOM subtree: attributes, content and component-instance bindings. */
export function collectDomMessageBindings(node: DomNodeIR | undefined, out: MessageBinding[] = []): MessageBinding[] {
  if (!node) return out;
  for (const expr of Object.values(node.bindings)) collectMessageBindings(expr, out);
  for (const expr of Object.values(node.propertyBindings)) collectMessageBindings(expr, out);
  if (node.content && "kind" in node.content) collectMessageBindings(node.content as BindingExpression, out);
  for (const child of node.children) collectDomMessageBindings(child, out);
  return out;
}

/**
 * Lower a message reference for a TypeScript-family backend. `catalog` is the
 * backend's in-scope resolved-messages accessor (`fsdsMessages`,
 * `fsdsMessages.value`, `this.fsdsMessages.value`, ...); `renderParam` lowers
 * each param binding with the backend's own walker. A parameterized message
 * goes through the runtime's `formatFsdsMessage` so translators control word
 * order; nothing is concatenated in generated code.
 */
export function composeMessageExpression(
  catalog: string,
  binding: MessageBinding,
  renderParam: (value: BindingExpression) => string | null,
): string | null {
  const access = `${catalog}.${binding.key}`;
  if (binding.params.length === 0) return access;
  const params: string[] = [];
  for (const param of binding.params) {
    const rendered = renderParam(param.value);
    if (rendered === null) return null;
    params.push(`${param.name}: ${rendered}`);
  }
  return `formatFsdsMessage(${access}, { ${params.join(", ")} })`;
}

/** The defaults object literal a TypeScript-family backend passes to its catalog lookup. */
export function messageDefaultsLiteral(messages: MessageIR[]): string {
  return `{ ${messages.map((m) => `${m.key}: ${JSON.stringify(m.defaultMessage)}`).join(", ")} }`;
}

/** Module-level constant name holding a component's default messages. */
export function messageDefaultsName(component: string): string {
  return `${component.replace(/[^A-Za-z0-9]/g, "")}Messages`;
}

/** True when any binding in the tree carries message params (needs `formatFsdsMessage`). */
export function usesMessageFormatting(ir: { dom?: DomNodeIR | null }): boolean {
  return collectDomMessageBindings(ir.dom ?? undefined).some((b) => b.params.length > 0);
}

/** True when the IR carries any message the backend must resolve at runtime. */
export function usesMessages(ir: { messages: MessageIR[] }): boolean {
  return ir.messages.length > 0;
}

export function findMessage(ir: { name: string; messages: MessageIR[] }, key: string): MessageIR {
  const message = ir.messages.find((m) => m.key === key);
  if (!message) throw new Error(`[MESSAGE_INVALID] ${ir.name}: unknown message '${key}'`);
  return message;
}

/**
 * Check the messages block against every reference: keys resolve, each
 * message's `{name}` placeholders equal its declared params, each binding
 * supplies exactly the declared params, prop defaults and sequence labels
 * name parameter-free messages (the slide position takes `index` and
 * `count`), and every declared message is referenced at least once.
 */
export function validateMessages(
  contract: ComponentContract,
  messages: MessageIR[],
  dom: DomNodeIR | undefined,
  props: ResolvedPropIR[],
  sequence: SequenceIR | null,
): void {
  const fail = (detail: string): never => {
    throw new Error(`[MESSAGE_INVALID] ${contract.name}: ${detail}`);
  };
  const byKey = new Map(messages.map((m) => [m.key, m]));
  for (const message of messages) {
    const placeholders = messagePlaceholders(message.defaultMessage).sort();
    const declared = [...message.params].sort();
    if (new Set(message.params).size !== message.params.length) fail(`message '${message.key}' declares a param twice`);
    if (placeholders.join(",") !== declared.join(",")) {
      fail(`message '${message.key}' placeholders {${placeholders.join("}, {")}} do not match params [${declared.join(", ")}]`);
    }
  }
  const used = new Set<string>();
  const use = (key: string, where: string, params: string[]) => {
    const message = byKey.get(key);
    if (!message) return fail(`${where} references unknown message '${key}'`);
    if ([...params].sort().join(",") !== [...message.params].sort().join(",")) {
      fail(`${where} supplies params [${params.join(", ")}] but message '${key}' declares [${message.params.join(", ")}]`);
    }
    used.add(key);
  };
  for (const binding of collectDomMessageBindings(dom)) {
    use(binding.key, "DOM binding", binding.params.map((p) => p.name));
  }
  const members = new Map(
    [
      ...(contract.props?.designed?.members ?? []),
      ...(contract.props?.constrained?.members ?? []),
      ...(contract.props?.styled?.members ?? []),
    ].map((m) => [m.name, m]),
  );
  for (const prop of props) {
    const member = members.get(prop.name);
    if (!member?.defaultMessage) continue;
    if (member.default !== undefined) fail(`prop '${prop.name}' declares both default and defaultMessage`);
    const stringTyped = prop.propType.kind === "string" || prop.type.trim() === "string";
    if (!stringTyped) fail(`prop '${prop.name}' has defaultMessage but is not string-typed`);
    use(member.defaultMessage, `prop '${prop.name}' defaultMessage`, []);
  }
  if (sequence) {
    use(sequence.labels.start, "sequence.labels.start", []);
    use(sequence.labels.stop, "sequence.labels.stop", []);
    use(sequence.labels.item, "sequence.labels.item", []);
    use(sequence.labels.position, "sequence.labels.position", ["index", "count"]);
  }
  for (const message of messages) {
    if (!used.has(message.key)) fail(`message '${message.key}' is declared but never referenced`);
  }
}
