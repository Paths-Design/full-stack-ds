import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { Text, type TextProps } from "react-native";

type ProjectedTextProps = Pick<TextProps, "style" | "numberOfLines">;
type PreparedFacts = { textOnly: boolean; hasText: boolean };
type Prepared = PreparedFacts & (
  | { kind: "leaf"; node: ReactNode }
  | { kind: "collection"; node: ReactNode[]; entries: Prepared[] }
  | { kind: "fragment"; node: ReactElement<{ children?: ReactNode }>; content: Prepared }
);

function prepareCollection(children: Iterable<ReactNode>): Prepared {
  const entries = Array.from(children, prepare);
  return {
    kind: "collection", node: entries.map(entry => entry.node), entries,
    textOnly: entries.every(entry => entry.textOnly), hasText: entries.some(entry => entry.hasText),
  };
}

function prepare(child: ReactNode): Prepared {
  if (isValidElement<{ children?: ReactNode }>(child)) {
    if (child.type === Fragment) {
      const content = prepare(child.props.children);
      return { kind: "fragment", node: cloneElement(child, undefined, content.node), content, textOnly: content.textOnly, hasText: content.hasText };
    }
    return { kind: "leaf", node: child, textOnly: false, hasText: false };
  }
  if (Array.isArray(child)) return prepareCollection(child);
  if (child !== null && typeof child === "object") {
    const iterable = child as Iterable<ReactNode>;
    if (typeof iterable[Symbol.iterator] === "function") return prepareCollection(iterable);
  }
  const hasText = typeof child === "string" || typeof child === "number" || typeof child === "bigint";
  return { kind: "leaf", node: child, hasText, textOnly: hasText || child == null || typeof child === "boolean" };
}

function renderCollection(prepared: Extract<Prepared, { kind: "collection" }>, textProps: ProjectedTextProps): ReactNode[] {
  if (prepared.textOnly) {
    // Retain the nested collection's key scope even when its text forms one block.
    return prepared.hasText ? [<Text key="fsds:text:0" {...textProps}>{prepared.node}</Text>] : prepared.node;
  }
  const occupiedKeys = new Set<string>();
  for (const entry of prepared.entries) {
    if (isValidElement(entry.node) && entry.node.key !== null) occupiedKeys.add(entry.node.key);
  }
  return prepared.entries.map((entry, index) => {
    if (entry.kind === "leaf" && entry.hasText) {
      let key = `fsds:text:${index}`;
      while (occupiedKeys.has(key)) key += ":";
      occupiedKeys.add(key);
      return <Text key={key} {...textProps}>{entry.node}</Text>;
    }
    return renderMixed(entry, textProps);
  });
}

function renderMixed(prepared: Prepared, textProps: ProjectedTextProps): ReactNode {
  if (prepared.kind === "collection") return renderCollection(prepared, textProps);
  if (prepared.kind === "fragment") {
    // Keep the consumer's keyed/ref-bearing fragment outside its content boundary.
    return cloneElement(prepared.node, undefined, renderScope(prepared.content, textProps));
  }
  return prepared.node;
}

function renderScope(prepared: Prepared, textProps: ProjectedTextProps): ReactNode {
  if (prepared.textOnly) return prepared.hasText ? <Text {...textProps}>{prepared.node}</Text> : prepared.node;
  return renderMixed(prepared, textProps);
}

/** Projects synchronous scalar scopes into native Text without inspecting consumers. */
export function renderTextChildren(children: ReactNode, textProps: ProjectedTextProps = {}): ReactNode {
  return renderScope(prepare(children), textProps);
}

/** Separates authored leaves; opaque elements count once without inspecting their output. */
export function renderSeparatedChildren(children: ReactNode, separator: string, textProps: ProjectedTextProps = {}): ReactNode {
  let hasPrevious = false;
  function authoredKey(entry: Prepared): string | undefined {
    if (entry.kind === "collection") return undefined;
    return isValidElement(entry.node) ? entry.node.key ?? undefined : undefined;
  }
  function visit(entry: Prepared, key?: string): ReactNode {
    if (entry.kind === "collection") {
      const occupied = new Set<string>();
      for (const child of entry.entries) {
        const existing = authoredKey(child);
        if (existing !== undefined) occupied.add(existing);
      }
      return entry.entries.map((child, index) => {
        let childKey = authoredKey(child);
        if (childKey === undefined) {
          childKey = `fsds:separated:${index}`;
          while (occupied.has(childKey)) childKey += ":";
          occupied.add(childKey);
        }
        return visit(child, childKey);
      });
    }
    if (entry.kind === "fragment") {
      return cloneElement(entry.node, key === undefined ? undefined : { key }, visit(entry.content));
    }
    const node = entry.node;
    if (node == null || typeof node === "boolean" || node === "") return node;
    const prepend = hasPrevious && separator !== "";
    hasPrevious = true;
    // Stable positions retain consumer state when the item becomes first or decoration disappears.
    return <Fragment key={key ?? authoredKey(entry)}>
      {prepend ? <Text style={textProps.style} accessible={false} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">{separator}</Text> : null}
      {entry.hasText ? renderTextChildren(node, textProps) : node}
    </Fragment>;
  }
  return visit(prepare(children));
}
