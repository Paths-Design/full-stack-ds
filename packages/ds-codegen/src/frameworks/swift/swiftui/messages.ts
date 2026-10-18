/**
 * SwiftUI lowering of contract messages onto the hand-maintained
 * `FsdsMessages` runtime (Presence/FsdsMessages.swift).
 *
 * A generated view reads `@Environment(\.fsdsMessages)` and resolves each
 * chrome string as `fsdsMessages.string("<Component>.<key>", default: …)`:
 * the host's `FsdsComponents` strings table wins over the contract default
 * baked at the call site. Swift init defaults cannot read the environment, so
 * a `defaultMessage` prop is stored as `<name>Prop` (init default `nil`) and
 * exposed through a computed `<name>` that applies explicit-value-first
 * precedence; archetype bodies keep referring to `<name>` unchanged.
 */
import type { ComponentIR } from "../../../ir.js";
import type { MessageIR } from "../../../messages.js";
import { propMessage, requireNativeParams } from "../../native-messages.js";
import { swiftLiteral } from "./icon-glyph.js";

export const SWIFT_MESSAGES_ENVIRONMENT = "@Environment(\\.fsdsMessages) private var fsdsMessages";

/** `fsdsMessages.string(...)` for `message`; `params` maps each declared param to a Swift `String` expression. */
export function swiftMessage(ir: ComponentIR, message: MessageIR, params: Record<string, string> = {}): string {
  requireNativeParams(ir, message, params);
  const args = [swiftLiteral(message.catalogKey), `default: ${swiftLiteral(message.defaultMessage)}`];
  if (message.params.length > 0) {
    args.push(`params: [${message.params.map((name) => `${swiftLiteral(name)}: ${params[name]}`).join(", ")}]`);
  }
  return `fsdsMessages.string(${args.join(", ")})`;
}

/**
 * Declaration pieces for an optional String prop. A `defaultMessage` prop
 * stores `<name>Prop` and adds a computed `<name>: String`; any other prop
 * keeps its stored `<name>: String?` with its authored literal default.
 */
export interface SwiftStringProp {
  stored: string;
  param: string;
  assign: string;
  accessor: string[];
}

export function swiftStringProp(ir: ComponentIR, name: string, indent: string): SwiftStringProp {
  const message = propMessage(ir, name);
  if (message) {
    return {
      stored: `${indent}private let ${name}Prop: String?`,
      param: `${name}: String? = nil,`,
      assign: `${indent}${indent}self.${name}Prop = ${name}`,
      accessor: [`${indent}private var ${name}: String { ${name}Prop ?? ${swiftMessage(ir, message)} }`],
    };
  }
  const authored = ir.styledProps.find((p) => p.safeName === name)?.defaultExpr?.replace(/^["']|["']$/g, "");
  return {
    stored: `${indent}private let ${name}: String?`,
    param: `${name}: String? = ${authored ? swiftLiteral(authored) : "nil"},`,
    assign: `${indent}${indent}self.${name} = ${name}`,
    accessor: [],
  };
}

/**
 * Declare the messages environment in every top-level View struct whose body
 * resolves a message, so archetypes lower lookups without each tracking
 * whether it emitted one. A lookup outside any View struct fails generation.
 */
export function withSwiftMessagesEnvironment(source: string, indent: string): string {
  if (!source.includes("fsdsMessages.string(")) return source;
  const lines = source.split("\n");
  const hosts: number[] = [];
  let covered = 0;
  for (let start = 0; start < lines.length; start++) {
    if (!/^public struct \S.*: View \{$/.test(lines[start]!)) continue;
    const end = lines.indexOf("}", start);
    const block = lines.slice(start, end < 0 ? lines.length : end);
    const uses = block.filter((line) => line.includes("fsdsMessages.string(")).length;
    if (uses === 0) continue;
    covered += uses;
    if (!block.some((line) => line.includes(SWIFT_MESSAGES_ENVIRONMENT))) hosts.push(start);
  }
  const total = lines.filter((line) => line.includes("fsdsMessages.string(")).length;
  if (covered !== total) {
    throw new Error("withSwiftMessagesEnvironment: a message lookup sits outside any View struct");
  }
  for (const start of hosts.reverse()) lines.splice(start + 1, 0, `${indent}${SWIFT_MESSAGES_ENVIRONMENT}`);
  return lines.join("\n");
}
