/**
 * Compose lowering of contract messages onto the hand-maintained
 * `FsdsMessages` runtime (library/.../messages/FsdsMessages.kt).
 *
 * A @Composable's default arguments are evaluated in composition, so a
 * message-backed parameter defaults to
 * `LocalFsdsMessages.current.string("<Component>.<key>", "<default>")`: an
 * explicit argument wins, then the provided catalog, then the contract
 * default baked at the call site. Body text reads a `fsdsMessages` value
 * hoisted to the top of the composable, because lookups often sit inside
 * non-composable lambdas (`Modifier.semantics { … }`) that cannot read a
 * CompositionLocal.
 */
import type { ComponentIR, ResolvedPropIR } from "../../ir.js";
import type { MessageIR } from "../../messages.js";
import { propMessage, requireNativeParams } from "../native-messages.js";

/** Receiver for default-argument lookups (composable context). */
export const KOTLIN_MESSAGES_LOCAL = "LocalFsdsMessages.current";
/** Receiver for body lookups: the hoisted local. */
export const KOTLIN_MESSAGES_VALUE = "fsdsMessages";
const KOTLIN_MESSAGES_IMPORT = "import com.fullstackds.messages.LocalFsdsMessages";
const KOTLIN_MESSAGES_HOIST = `val ${KOTLIN_MESSAGES_VALUE} = ${KOTLIN_MESSAGES_LOCAL}`;

/**
 * Kotlin string literal. Escapes backslashes, quotes, template dollars and
 * every control character (a raw line break would end the literal mid-string).
 */
export function kotlinStringLiteral(value: string): string {
  const escape = (ch: string): string => {
    switch (ch) {
      case "\\": return "\\\\";
      case '"': return '\\"';
      case "$": return "\\$";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\t": return "\\t";
      case "\b": return "\\b";
    }
    const code = ch.codePointAt(0)!;
    return code < 0x20 || code === 0x7f ? `\\u${code.toString(16).padStart(4, "0")}` : ch;
  };
  return `"${Array.from(value, escape).join("")}"`;
}

/**
 * `<receiver>.string(...)` for `message`; `params` maps each declared param
 * to a Kotlin `String` expression. Body sites use the hoisted value; default
 * arguments pass {@link KOTLIN_MESSAGES_LOCAL}.
 */
export function kotlinMessage(
  ir: ComponentIR,
  message: MessageIR,
  params: Record<string, string> = {},
  receiver: string = KOTLIN_MESSAGES_VALUE,
): string {
  requireNativeParams(ir, message, params);
  const args = [kotlinStringLiteral(message.catalogKey), kotlinStringLiteral(message.defaultMessage)];
  if (message.params.length > 0) {
    args.push(`mapOf(${message.params.map((name) => `${kotlinStringLiteral(name)} to ${params[name]}`).join(", ")})`);
  }
  return `${receiver}.string(${args.join(", ")})`;
}

/**
 * The default-argument expression for a String prop: its message lookup when
 * it declares `defaultMessage`, its authored literal otherwise, or null when
 * it has neither.
 */
export function kotlinStringDefault(ir: ComponentIR, prop: ResolvedPropIR | undefined): string | null {
  if (!prop) return null;
  const message = propMessage(ir, prop.name);
  if (message) return kotlinMessage(ir, message, {}, KOTLIN_MESSAGES_LOCAL);
  if (prop.defaultExpr === undefined) return null;
  return kotlinStringLiteral(String(prop.defaultExpr).replace(/^["']|["']$/g, ""));
}

/**
 * Wire a generated file's message reads: hoist `val fsdsMessages` into every
 * top-level composable whose body uses it, and import LocalFsdsMessages. A
 * body lookup outside any composable fails generation.
 */
export function withKotlinMessages(source: string): string {
  const bodyUse = `${KOTLIN_MESSAGES_VALUE}.string(`;
  const usesLocal = source.includes(`${KOTLIN_MESSAGES_LOCAL}.string(`);
  if (!usesLocal && !source.includes(bodyUse)) return source;
  const lines = source.split("\n");
  const hoists: number[] = [];
  let covered = 0;
  for (let at = 0; at < lines.length; at++) {
    if (!/^(?:(?:private|internal) )?fun \w+\(/.test(lines[at]!) || lines[at - 1]?.trim() !== "@Composable") continue;
    const open = lines[at]!.endsWith("{") ? at : lines.indexOf(") {", at);
    const close = lines.indexOf("}", open + 1);
    if (open < 0 || close < 0) continue;
    const body = lines.slice(open + 1, close);
    const uses = body.filter((line) => line.includes(bodyUse)).length;
    if (uses === 0) continue;
    covered += uses;
    if (!body.some((line) => line.trim() === KOTLIN_MESSAGES_HOIST)) hoists.push(open);
  }
  const total = lines.filter((line) => line.includes(bodyUse)).length;
  if (covered !== total) throw new Error("withKotlinMessages: a message lookup sits outside any composable body");
  for (const open of hoists.reverse()) lines.splice(open + 1, 0, `    ${KOTLIN_MESSAGES_HOIST}`);
  if (!lines.includes(KOTLIN_MESSAGES_IMPORT)) {
    const start = lines.indexOf("// @generated:start imports");
    if (start < 0) throw new Error("withKotlinMessages: generated file has no imports region");
    let at = start + 1;
    while (at < lines.length && lines[at]!.startsWith("import ") && lines[at]! < KOTLIN_MESSAGES_IMPORT) at += 1;
    lines.splice(at, 0, KOTLIN_MESSAGES_IMPORT);
  }
  return lines.join("\n");
}
