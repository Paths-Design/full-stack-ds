/**
 * Target-neutral message lookup for the native emitters (SwiftUI, Compose).
 *
 * Native emitters realize components through archetype bodies rather than a
 * generic DOM walk, so each chrome string they render must still name the
 * contract message that owns it. These helpers answer "which message does
 * this part's attribute/content carry" and "which message does this prop
 * fall back to" from the IR, so an emitter lowers a catalog lookup instead
 * of authoring English. A part or prop that carries no message yields
 * `undefined`; the caller then renders nothing rather than inventing text.
 */
import type { BindingExpression, ComponentIR, DomNodeIR } from "../ir.js";
import { findMessage, type MessageBinding, type MessageIR } from "../messages.js";

export interface NativeMessageRef {
  message: MessageIR;
  /** Param bindings the reference supplies (empty for parameter-free messages). */
  params: MessageBinding["params"];
}

function findPartNode(node: DomNodeIR | null | undefined, part: string): DomNodeIR | undefined {
  if (!node) return undefined;
  if (node.part === part) return node;
  for (const child of node.children) {
    const found = findPartNode(child, part);
    if (found) return found;
  }
  return undefined;
}

function asMessage(ir: ComponentIR, expr: BindingExpression | undefined): NativeMessageRef | undefined {
  if (!expr || expr.kind !== "message") return undefined;
  return { message: findMessage(ir, expr.key), params: expr.params };
}

/**
 * The message bound to `part`'s `attribute`, or to its text content when
 * `attribute` is `"content"`.
 */
export function partMessage(ir: ComponentIR, part: string, attribute: string): NativeMessageRef | undefined {
  const node = findPartNode(ir.dom, part);
  if (!node) return undefined;
  if (attribute === "content") {
    const content = node.content;
    return content && "kind" in content ? asMessage(ir, content as BindingExpression) : undefined;
  }
  return asMessage(ir, node.bindings[attribute] ?? node.propertyBindings[attribute]);
}

/**
 * Where a part's attribute/content text comes from: a message, or a prop
 * (with the message it falls back to when it declares `defaultMessage`).
 */
export type NativeTextSource =
  | { kind: "message"; ref: NativeMessageRef }
  | { kind: "prop"; prop: string; fallback: MessageIR | undefined };

/** The text source a single binding names, if it is a message or a plain prop. */
export function textSourceOf(ir: ComponentIR, expr: BindingExpression | undefined): NativeTextSource | undefined {
  const message = asMessage(ir, expr);
  if (message) return { kind: "message", ref: message };
  if (expr?.kind !== "prop" || (expr.path?.length ?? 0) > 0) return undefined;
  return { kind: "prop", prop: expr.prop, fallback: propMessage(ir, expr.prop) };
}

/** Text source of one DOM node's attribute (or `"content"`), for parts that repeat. */
export function nodeTextSource(ir: ComponentIR, node: DomNodeIR | undefined, attribute: string): NativeTextSource | undefined {
  const raw = attribute === "content" ? node?.content : node?.bindings[attribute];
  return textSourceOf(ir, raw && "kind" in raw ? (raw as BindingExpression) : undefined);
}

export function partTextSource(ir: ComponentIR, part: string, attribute: string): NativeTextSource | undefined {
  return nodeTextSource(ir, findPartNode(ir.dom, part), attribute);
}

/**
 * The two text arms of a content binding toggled by a boolean channel
 * (`conditional:channel:expanded.value|<when true>|<when false>`), e.g. a
 * disclosure trigger's "Show less" / "Show more".
 */
export function channelToggledText(
  ir: ComponentIR,
  channel: string,
): { whenTrue: NativeTextSource; whenFalse: NativeTextSource } | undefined {
  let found: { whenTrue: NativeTextSource; whenFalse: NativeTextSource } | undefined;
  const walk = (node: DomNodeIR): void => {
    const content = node.content;
    const expr = content && "kind" in content ? (content as BindingExpression) : undefined;
    if (!found && expr?.kind === "conditional" && expr.condition.kind === "channel" && expr.condition.channel === channel) {
      const whenTrue = textSourceOf(ir, expr.whenTrue);
      const whenFalse = textSourceOf(ir, expr.whenFalse);
      if (whenTrue && whenFalse) found = { whenTrue, whenFalse };
    }
    node.children.forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return found;
}

/** Every DOM node whose text content is a message, in document order. */
export function contentMessages(ir: ComponentIR): Array<{ part: string | undefined; ref: NativeMessageRef }> {
  const out: Array<{ part: string | undefined; ref: NativeMessageRef }> = [];
  const walk = (node: DomNodeIR): void => {
    const content = node.content;
    const ref = content && "kind" in content ? asMessage(ir, content as BindingExpression) : undefined;
    if (ref) out.push({ part: node.part, ref });
    node.children.forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

/** The message a `defaultMessage` prop resolves to when the consumer passes nothing. */
export function propMessage(ir: ComponentIR, prop: string): MessageIR | undefined {
  const resolved = ir.styledProps.find((p) => p.name === prop || p.safeName === prop);
  return resolved?.defaultMessage ? findMessage(ir, resolved.defaultMessage) : undefined;
}

/** A parameter-free message by key (sequence labels and other policy-owned text). */
export function namedMessage(ir: ComponentIR, key: string): MessageIR {
  return findMessage(ir, key);
}

/**
 * Check that a native call site supplies exactly the message's declared
 * params, so a contract change that adds a placeholder fails generation
 * instead of rendering a raw `{name}`.
 */
export function requireNativeParams(ir: ComponentIR, message: MessageIR, supplied: Record<string, string>): void {
  const expected = [...message.params].sort().join(",");
  const actual = Object.keys(supplied).sort().join(",");
  if (expected !== actual) {
    throw new Error(
      `[MESSAGE_INVALID] ${ir.name}: native lowering of '${message.key}' supplies params [${actual}] ` +
        `but the message declares [${expected}]`,
    );
  }
}
