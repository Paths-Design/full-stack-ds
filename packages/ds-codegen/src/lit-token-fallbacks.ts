import type { ComponentIR, CssBlockIR } from "./ir.js";

const IDENTIFIER = /^(?:[\w\u0080-\uffff-]|\\(?:[0-9a-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[^\r\n\f]))+/i;
function identifierValue(value: string): string {
  return value.replace(/\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|([^\r\n\f]))/gi, (_match, hex: string | undefined, character: string | undefined) => {
    if (!hex) return character ?? "";
    const point = parseInt(hex, 16);
    return point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff) ? "\ufffd" : String.fromCodePoint(point);
  });
}

// CSS-wide keywords act at cascade time, rather than supplying a token value.
// Moving an explicit inherit/reset to a different property changes its meaning.
// https://www.w3.org/TR/css-variables-1/#defining-variables
function isCascadeReset(value: string): boolean {
  const normalized = value.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, "");
  const identifier = normalized.match(IDENTIFIER)?.[0];
  if (!identifier || !/^(initial|inherit|unset|revert|revert-layer|revert-rule)$/i.test(identifierValue(identifier))) return false;
  const remainder = normalized.slice(identifier.length).replace(/^[ \t\r\n\f]+/, "");
  if (!remainder) return true;
  if (!remainder.startsWith("!")) return false;
  const priority = remainder.slice(1).replace(/^[ \t\r\n\f]+/, "");
  const priorityIdentifier = priority.match(IDENTIFIER)?.[0];
  return !!priorityIdentifier && /^important$/i.test(identifierValue(priorityIdentifier)) && priorityIdentifier.length === priority.length;
}

/**
 * Keep a public token read at its consumer and supply the local default only
 * when that public value is absent. Quotes/comments and nested var() fallbacks
 * retain their original grammar and CSS validity behavior.
 */
export function withLitTokenFallbacks(value: string, defaults: ReadonlyMap<string, string>): string {
  if (!defaults.size) return value;
  const stack: Array<{ end: number; fallback: string } | undefined> = [];
  const insertions = new Map<number, string[]>();
  const insert = (at: number, text: string): void => {
    const items = insertions.get(at) ?? [];
    items.push(text);
    insertions.set(at, items);
  };
  for (let i = 0; i < value.length;) {
    const character = value[i]!;
    if (value.startsWith("/*", i)) {
      const end = value.indexOf("*/", i + 2);
      i = end < 0 ? value.length : end + 2;
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      i += 1;
      while (i < value.length) {
        if (value[i] === "\\") { i += 2; continue; }
        if (value[i++] === quote) break;
      }
      continue;
    }
    const identifier = value.slice(i).match(IDENTIFIER);
    if (identifier) {
      const end = i + identifier[0].length;
      if (identifierValue(identifier[0]).toLowerCase() === "var" && value[end] === "(") {
        const whitespace = value.slice(end + 1).match(/^(?:[ \t\r\n\f]|\/\*[\s\S]*?\*\/)*/)![0];
        const argument = value.slice(end + 1 + whitespace.length).match(IDENTIFIER);
        const fallback = argument ? defaults.get(identifierValue(argument[0])) : undefined;
        i = end + 1 + whitespace.length + (argument?.[0].length ?? 0);
        stack.push(fallback ? { end: i, fallback } : undefined);
        continue;
      }
      i = end;
      continue;
    }
    if (character === "(") stack.push(undefined);
    else if (character === ")") {
      const variable = stack.pop();
      if (variable) {
        insert(variable.end, `, var(${variable.fallback}`);
        insert(i, ")");
      }
    }
    i += 1;
  }
  let result = "", offset = 0;
  for (const [at, texts] of [...insertions].sort(([a], [b]) => a - b)) {
    result += value.slice(offset, at) + texts.join("");
    offset = at;
  }
  return result + value.slice(offset);
}

/**
 * Source fact: normalized root CSS slot declarations and shadow inheritance.
 * Applies by: root/default values and the component's public slot namespace.
 * Removable when: component defaults cease to lower into shadow CSS.
 *
 * tokenScopes is a native projection and omits Web-only dotted style slots;
 * the consumed Web declarations own the complete default inventory here.
 */
export function litTokenDefaultBlocks(ir: ComponentIR, blocks: readonly CssBlockIR[]) {
  const root = `.${ir.cssPrefix}`;
  const prefix = `--fsds-${ir.cssPrefix}-`;
  const rootDeclarations = Object.fromEntries(blocks.filter(block => block.selector === root && !block.startingStyle)
    .flatMap(block => Object.entries(block.declarations)));
  const defaults = new Map<string, string>(Object.entries(rootDeclarations)
    .filter(([name, value]) => name.startsWith(prefix) && !name.startsWith("--fsds-box-model-") && !isCascadeReset(value))
    .map(([name]) => [name, name.replace(/^--fsds-/, "--_fsds-")] as const));
  return {
    defaults,
    blocks: blocks.map(block => ({ ...block, declarations: Object.fromEntries(
      Object.entries(block.declarations).map(([name, value]) => [
        block.selector === root && !block.startingStyle ? defaults.get(name) ?? name : name,
        withLitTokenFallbacks(value, defaults),
      ]),
    ) })),
  };
}
