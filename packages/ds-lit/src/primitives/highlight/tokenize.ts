/**
 * Canonical tokenizer for the `highlight` content transform
 * (FEAT-CODEBLOCK-HIGHLIGHT-01).
 *
 * This file is the SINGLE SOURCE for syntax tokenization. Codegen emits it
 * byte-identical into every web framework package
 * (`src/primitives/highlight/tokenize.ts`); framework packages never
 * implement their own tokenizer. Behavioral identity across frameworks is a
 * spec invariant, proven by golden-fixture tests in each package.
 *
 * Contract guarantees (mirrored in CodeBlock.contract.json):
 *   - PURE + SYNCHRONOUS + DETERMINISTIC: same input, same token stream,
 *     no side effects — SSR-safe in every target.
 *   - LOSSLESS ROUND-TRIP: concatenating every token's `text` in order
 *     reproduces the input exactly, so copied text always equals the source.
 *   - CLOSED KIND ENUM: every `kind` is a CodeBlockTokenType member
 *     (comment | definition | keyword | plain | property | punctuation |
 *     static | string | tag).
 *   - TEXT-ONLY: callers render token text as text children; nothing here
 *     ever interprets the source as markup.
 *
 * The tokenization is a lexical approximation (regex-level, no parse tree):
 * ambiguous constructs (JS regex literals vs division, JSX `<` vs less-than
 * outside the tag heuristic) degrade to plain/punctuation rather than
 * guessing a parse. Unknown languages degrade to a single plain run.
 */

import { prepareSourceLines, type HighlightSource, type HighlightToken, type HighlightTokenKind } from "./source-model.js";
export { prepareSourceLines } from "./source-model.js";
export type { HighlightToken, HighlightTokenKind, HighlightLine, HighlightSource } from "./source-model.js";

/** Resolve one canonical source into lossless lines for every web renderer. */
export function prepareHighlightSource(
  code: string,
  language: string,
  options: { readonly tokens?: readonly HighlightToken[] | null; readonly highlight?: boolean } = {},
): HighlightSource {
  const source = code ?? "";
  if (options.highlight === false) return prepareSourceLines(source, undefined, false);
  return prepareSourceLines(source, options.tokens === undefined ? tokenizeCode(source, language) : options.tokens, true);
}

export type HighlightLanguage =
  | "bash"
  | "css"
  | "html"
  | "javascript"
  | "json"
  | "jsx"
  | "markdown"
  | "plaintext"
  | "svelte"
  | "tsx"
  | "typescript"
  | "vue";

const JS_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "keyof",
  "let",
  "namespace",
  "new",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

const JS_STATIC_WORDS = new Set([
  "Infinity",
  "NaN",
  "false",
  "null",
  "true",
  "undefined",
]);

const TS_BUILTIN_TYPES = new Set([
  "any",
  "bigint",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "unknown",
]);

const IDENTIFIER_START = /^[A-Za-z_$]/;
const IDENTIFIER_BODY = /[A-Za-z0-9_$-]/y;
const JS_NUMBER =
  /0[xXbBoO][0-9a-fA-F_]+n?|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?n?|\.\d[\d_]*(?:[eE][+-]?\d+)?/y;
const PUNCTUATION_CHARS = new Set([
  "!",
  "%",
  "&",
  "(",
  ")",
  "*",
  "+",
  ",",
  "-",
  ".",
  "/",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "@",
  "[",
  "]",
  "^",
  "{",
  "|",
  "}",
  "~",
]);
const OPERATOR_RUN = /[!%&*+\-./:<=>?@^|~]+/y;
const WHITESPACE_RUN = /[ \t\r\n]+/y;

interface TokenSink {
  push(kind: HighlightTokenKind, text: string): void;
}

function matchAt(input: string, pos: number, regex: { sticky: boolean; lastIndex: number; exec(text: string): RegExpExecArray | null }): string | undefined {
  regex.lastIndex = pos;
  const found = regex.exec(input);
  return found ? found[0] : undefined;
}

function readWord(input: string, pos: number, body: RegExp): string {
  body.lastIndex = pos + 1;
  let end = pos + 1;
  while (end < input.length) {
    body.lastIndex = end;
    if (!body.test(input)) break;
    end += 1;
  }
  return input.slice(pos, end);
}

function looksLikeCall(input: string, pos: number): boolean {
  let cursor = pos;
  while (cursor < input.length && (input[cursor] === " " || input[cursor] === "\t")) {
    cursor += 1;
  }
  return input[cursor] === "(";
}

function scanQuoted(input: string, pos: number, quote: string): string {
  let end = pos + 1;
  while (end < input.length) {
    const ch = input[end] ?? "";
    if (ch === "\\") {
      end += 2;
      continue;
    }
    if (quote === "`" && ch === "`") return input.slice(pos, end + 1);
    if (quote !== "`" && (ch === quote || ch === "\n")) {
      return input.slice(pos, ch === quote ? end + 1 : end);
    }
    end += 1;
  }
  return input.slice(pos);
}

function looksLikeTypeProperty(input: string, pos: number, word: string): boolean {
  const lineStart = input.lastIndexOf("\n", pos - 1) + 1;
  if (input.slice(lineStart, pos).trim() !== "") return false;
  let cursor = pos + word.length;
  if (input[cursor] === "?") cursor += 1;
  while (input[cursor] === " " || input[cursor] === "\t") cursor += 1;
  return input[cursor] === ":";
}

function findExpressionEnd(input: string, start: number): number {
  let depth = 1;
  let pos = start;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      pos += Math.max(1, scanQuoted(input, pos, ch).length);
      continue;
    }
    if (ch === "/" && input[pos + 1] === "/") {
      const end = input.indexOf("\n", pos + 2);
      pos = end === -1 ? input.length : end;
      continue;
    }
    if (ch === "/" && input[pos + 1] === "*") {
      const end = input.indexOf("*/", pos + 2);
      pos = end === -1 ? input.length : end + 2;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}" && --depth === 0) return pos;
    pos += 1;
  }
  return -1;
}

function pushTokenRange(tokens: HighlightToken[], start: number, end: number, sink: TokenSink): void {
  let offset = 0;
  for (const token of tokens) {
    const tokenEnd = offset + token.text.length;
    const from = Math.max(start, offset);
    const to = Math.min(end, tokenEnd);
    if (to > from) sink.push(token.kind, token.text.slice(from - offset, to - offset));
    offset = tokenEnd;
    if (offset >= end) break;
  }
}

function tokenizeTaggedTemplate(
  input: string,
  start: number,
  language: "css" | "html",
  sink: TokenSink,
  options: { jsx: boolean; typescript: boolean },
): number {
  const expressions: { start: number; end: number }[] = [];
  let pos = start + 1;
  while (pos < input.length) {
    if (input[pos] === "\\") {
      pos += 2;
      continue;
    }
    if (input[pos] === "$" && input[pos + 1] === "{") {
      const end = findExpressionEnd(input, pos + 2);
      if (end === -1) break;
      expressions.push({ start: pos, end });
      pos = end + 1;
      continue;
    }
    if (input[pos] === "`") {
      const body = input.slice(start + 1, pos);
      const embedded: HighlightToken[] = [];
      const embeddedSink: TokenSink = { push: (kind, text) => {
        if (text) embedded.push({ kind, text });
      } };
      if (language === "css") tokenizeCss(body, embeddedSink);
      else tokenizeHtml(body, embeddedSink);
      sink.push("punctuation", "`");
      let cursor = 0;
      for (const expression of expressions) {
        const relativeStart = expression.start - start - 1;
        const relativeEnd = expression.end - start - 1;
        pushTokenRange(embedded, cursor, relativeStart, sink);
        sink.push("punctuation", "${");
        tokenizeJsFamily(input.slice(expression.start + 2, expression.end), sink, options);
        sink.push("punctuation", "}");
        cursor = relativeEnd + 1;
      }
      pushTokenRange(embedded, cursor, body.length, sink);
      sink.push("punctuation", "`");
      return pos + 1;
    }
    pos += 1;
  }
  sink.push("string", input.slice(start));
  return input.length;
}

function tokenizeJsFamily(
  input: string,
  sink: TokenSink,
  options: { jsx: boolean; typescript: boolean },
): void {
  let pos = 0;
  let inTag = false;
  let jsxText = false;
  let tagBraceDepth = 0;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    if (inTag) {
      const ws = matchAt(input, pos, WHITESPACE_RUN);
      if (ws) {
        sink.push("plain", ws);
        pos += ws.length;
        continue;
      }
      if (ch === '"' || ch === "'") {
        const text = scanQuoted(input, pos, ch);
        sink.push("string", text);
        pos += text.length;
        continue;
      }
      if (ch === ">") {
        sink.push("punctuation", ">");
        inTag = false;
        jsxText = true;
        pos += 1;
        continue;
      }
      if (ch === "/" && input[pos + 1] === ">") {
        sink.push("punctuation", "/>");
        inTag = false;
        jsxText = true;
        pos += 2;
        continue;
      }
      if (ch === "{" || ch === "}") {
        sink.push("punctuation", ch);
        inTag = false;
        if (ch === "{") tagBraceDepth = 1;
        pos += 1;
        continue;
      }
      if (IDENTIFIER_START.test(ch)) {
        const word = readWord(input, pos, IDENTIFIER_BODY);
        sink.push("property", word);
        pos += word.length;
        continue;
      }
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    const ws = matchAt(input, pos, WHITESPACE_RUN);
    if (ws) {
      sink.push("plain", ws);
      pos += ws.length;
      continue;
    }
    if (ch === "/" && input[pos + 1] === "/") {
      const end = input.indexOf("\n", pos);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end);
      sink.push("comment", text);
      pos += text.length;
      continue;
    }
    if (ch === "/" && input[pos + 1] === "*") {
      const end = input.indexOf("*/", pos + 2);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end + 2);
      sink.push("comment", text);
      pos += text.length;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const text = scanQuoted(input, pos, ch);
      sink.push("string", text);
      pos += text.length;
      continue;
    }
    if (
      options.jsx &&
      ch === "<" &&
      (input[pos + 1] === "/"
        ? /[A-Za-z]/.test(input[pos + 2] ?? "")
        : /[A-Za-z]/.test(input[pos + 1] ?? ""))
    ) {
      const open = input[pos + 1] === "/" ? "</" : "<";
      sink.push("punctuation", open);
      pos += open.length;
      const name = matchAt(input, pos, /[A-Za-z][A-Za-z0-9.-]*/y);
      if (name) {
        sink.push("tag", name);
        pos += name.length;
      }
      inTag = true;
      continue;
    }
    const number = matchAt(input, pos, JS_NUMBER);
    if (number && (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[pos + 1] ?? "")))) {
      sink.push("static", number);
      pos += number.length;
      continue;
    }
    if (IDENTIFIER_START.test(ch)) {
      const wasJsxText = jsxText;
      jsxText = false;
      const word = readWord(input, pos, /[A-Za-z0-9_$]/y);
      if ((word === "css" || word === "html") && input[pos + word.length] === "`") {
        sink.push("definition", word);
        pos = tokenizeTaggedTemplate(input, pos + word.length, word, sink, options);
        continue;
      }
      if (JS_STATIC_WORDS.has(word)) {
        sink.push("static", word);
      } else if (JS_KEYWORDS.has(word)) {
        sink.push("keyword", word);
      } else if (options.typescript && looksLikeTypeProperty(input, pos, word)) {
        sink.push("property", word);
      } else if (looksLikeCall(input, pos + word.length)) {
        sink.push("definition", word);
      } else if (wasJsxText) {
        sink.push("plain", word);
      } else if (options.typescript && /^[A-Z]/.test(word)) {
        sink.push("definition", word);
      } else if (options.typescript && TS_BUILTIN_TYPES.has(word)) {
        sink.push("definition", word);
      } else {
        sink.push("plain", word);
      }
      pos += word.length;
      continue;
    }
    if (PUNCTUATION_CHARS.has(ch)) {
      jsxText = false;
      if (tagBraceDepth > 0 && (ch === "{" || ch === "}")) {
        tagBraceDepth += ch === "{" ? 1 : -1;
        sink.push("punctuation", ch);
        if (tagBraceDepth === 0) inTag = true;
        pos += 1;
        continue;
      }
      const run = matchAt(input, pos, OPERATOR_RUN);
      if (run) {
        sink.push("punctuation", run);
        pos += run.length;
        continue;
      }
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    sink.push("plain", ch);
    pos += 1;
  }
}

function tokenizeJson(input: string, sink: TokenSink): void {
  let pos = 0;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    const ws = matchAt(input, pos, WHITESPACE_RUN);
    if (ws) {
      sink.push("plain", ws);
      pos += ws.length;
      continue;
    }
    if (ch === '"') {
      const text = scanQuoted(input, pos, '"');
      let cursor = pos + text.length;
      while (cursor < input.length && /[ \t\r\n]/.test(input[cursor] ?? "")) {
        cursor += 1;
      }
      sink.push(input[cursor] === ":" ? "property" : "string", text);
      pos += text.length;
      continue;
    }
    const word = matchAt(input, pos, /[A-Za-z_$][A-Za-z0-9_$]*/y);
    if (word) {
      sink.push(word === "true" || word === "false" || word === "null" ? "static" : "plain", word);
      pos += word.length;
      continue;
    }
    const number = matchAt(input, pos, /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y);
    if (number) {
      sink.push("static", number);
      pos += number.length;
      continue;
    }
    if ("{}[],:".includes(ch)) {
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    sink.push("plain", ch);
    pos += 1;
  }
}

const CSS_VALUE_KEYWORDS = new Set([
  "auto",
  "important",
  "inherit",
  "initial",
  "none",
  "revert",
  "unset",
]);

function tokenizeCss(input: string, sink: TokenSink): void {
  let pos = 0;
  let depth = 0;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    const ws = matchAt(input, pos, WHITESPACE_RUN);
    if (ws) {
      sink.push("plain", ws);
      pos += ws.length;
      continue;
    }
    if (ch === "/" && input[pos + 1] === "*") {
      const end = input.indexOf("*/", pos + 2);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end + 2);
      sink.push("comment", text);
      pos += text.length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const text = scanQuoted(input, pos, ch);
      sink.push("string", text);
      pos += text.length;
      continue;
    }
    if (ch === "@") {
      const word = matchAt(input, pos, /@[A-Za-z-]+/y);
      if (word) {
        sink.push("keyword", word);
        pos += word.length;
        continue;
      }
    }
    if (ch === "-" && input[pos + 1] === "-") {
      const word = matchAt(input, pos, /--[A-Za-z0-9-]+/y);
      if (word) {
        sink.push("property", word);
        pos += word.length;
        continue;
      }
    }
    if (ch === "#" && /[0-9a-fA-F]/.test(input[pos + 1] ?? "")) {
      const hex = matchAt(input, pos, /#[0-9a-fA-F]{3,8}/y);
      if (hex) {
        sink.push("static", hex);
        pos += hex.length;
        continue;
      }
    }
    const dimension = matchAt(
      input,
      pos,
      /-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|fr|deg|rad|turn|s|ms|Hz|dpi)?/y,
    );
    if (dimension && (/[0-9.]/.test(ch) || (ch === "-" && /[0-9.]/.test(input[pos + 1] ?? "")))) {
      sink.push("static", dimension);
      pos += dimension.length;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    if (IDENTIFIER_START.test(ch) || ch === "-") {
      const word = readWord(input, pos, /[A-Za-z0-9_-]/y);
      let cursor = pos + word.length;
      while (cursor < input.length && /[ \t]/.test(input[cursor] ?? "")) {
        cursor += 1;
      }
      if (depth > 0 && input[cursor] === ":") {
        sink.push("property", word);
      } else if (CSS_VALUE_KEYWORDS.has(word)) {
        sink.push("keyword", word);
      } else {
        sink.push("plain", word);
      }
      pos += word.length;
      continue;
    }
    sink.push("punctuation", ch);
    pos += 1;
  }
}

function tokenizeHtml(input: string, sink: TokenSink): void {
  let pos = 0;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    if (ch === "<" && input.startsWith("<!--", pos)) {
      const end = input.indexOf("-->", pos + 4);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end + 3);
      sink.push("comment", text);
      pos += text.length;
      continue;
    }
    if (ch === "<" && input.slice(pos, pos + 9).toUpperCase() === "<!DOCTYPE") {
      const end = input.indexOf(">", pos);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end + 1);
      sink.push("keyword", text);
      pos += text.length;
      continue;
    }
    if (ch === "<" && (/[A-Za-z]/.test(input[pos + 1] ?? "") || input[pos + 1] === "/")) {
      const open = input[pos + 1] === "/" ? "</" : "<";
      sink.push("punctuation", open);
      pos += open.length;
      const name = matchAt(input, pos, /[A-Za-z][A-Za-z0-9-]*/y);
      if (name) {
        sink.push("tag", name);
        pos += name.length;
      }
      while (pos < input.length) {
        const inner = input[pos] ?? "";
        const ws = matchAt(input, pos, WHITESPACE_RUN);
        if (ws) {
          sink.push("plain", ws);
          pos += ws.length;
          continue;
        }
        if (inner === '"' || inner === "'") {
          const text = scanQuoted(input, pos, inner);
          sink.push("string", text);
          pos += text.length;
          continue;
        }
        if (inner === "/" && input[pos + 1] === ">") {
          sink.push("punctuation", "/>");
          pos += 2;
          break;
        }
        if (inner === ">") {
          sink.push("punctuation", ">");
          pos += 1;
          break;
        }
        if (inner === "=") {
          sink.push("punctuation", "=");
          pos += 1;
          continue;
        }
        if (IDENTIFIER_START.test(inner)) {
          const word = readWord(input, pos, /[A-Za-z0-9_-]/y);
          sink.push("property", word);
          pos += word.length;
          continue;
        }
        sink.push("punctuation", inner);
        pos += 1;
      }
      continue;
    }
    if (ch === "&") {
      const entity = matchAt(input, pos, /&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+);/y);
      if (entity) {
        sink.push("static", entity);
        pos += entity.length;
        continue;
      }
    }
    let end = pos + 1;
    while (end < input.length && input[end] !== "<" && input[end] !== "&") {
      end += 1;
    }
    const text = input.slice(pos, end);
    sink.push("plain", text);
    pos += text.length;
  }
}

function tagEnd(input: string, start: number): number {
  let quote = "";
  for (let pos = start + 1; pos < input.length; pos += 1) {
    const ch = input[pos] ?? "";
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return pos + 1;
    }
  }
  return -1;
}

function tokenizeSingleFileComponent(input: string, sink: TokenSink): void {
  let markupStart = 0;
  let scan = 0;
  while (scan < input.length) {
    const open = input.indexOf("<", scan);
    if (open === -1) break;
    if (input.startsWith("<!--", open)) {
      const commentEnd = input.indexOf("-->", open + 4);
      scan = commentEnd === -1 ? input.length : commentEnd + 3;
      continue;
    }
    const end = tagEnd(input, open);
    if (end === -1) break;
    const name = /^<\s*(script|style)\b/i.exec(input.slice(open, end))?.[1]?.toLowerCase();
    if (!name) {
      scan = end;
      continue;
    }
    const closePattern = new RegExp(`</${name}\\s*>`, "gi");
    closePattern.lastIndex = end;
    const close = closePattern.exec(input);
    if (!close) break;
    tokenizeHtml(input.slice(markupStart, end), sink);
    const body = input.slice(end, close.index);
    if (name === "style") {
      tokenizeCss(body, sink);
    } else if (/\blang\s*=\s*["'](?:ts|typescript)["']/i.test(input.slice(open, end))) {
      tokenizeJsFamily(body, sink, { jsx: false, typescript: true });
    } else {
      tokenizeJsFamily(body, sink, { jsx: false, typescript: false });
    }
    const closeEnd = close.index + close[0].length;
    tokenizeHtml(input.slice(close.index, closeEnd), sink);
    markupStart = closeEnd;
    scan = closeEnd;
  }
  tokenizeHtml(input.slice(markupStart), sink);
}

const BASH_STATIC_WORDS = new Set(["false", "true"]);

function tokenizeBash(input: string, sink: TokenSink): void {
  let pos = 0;
  let commandPosition = true;
  while (pos < input.length) {
    const ch = input[pos] ?? "";
    if (ch === "\n") {
      sink.push("plain", ch);
      commandPosition = true;
      pos += 1;
      continue;
    }
    const ws = matchAt(input, pos, /[ \t\r]+/y);
    if (ws) {
      sink.push("plain", ws);
      pos += ws.length;
      continue;
    }
    if (ch === "#") {
      const end = input.indexOf("\n", pos);
      const text = end === -1 ? input.slice(pos) : input.slice(pos, end);
      sink.push("comment", text);
      pos += text.length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const text = scanQuoted(input, pos, ch);
      sink.push("string", text);
      commandPosition = false;
      pos += text.length;
      continue;
    }
    if (ch === "$") {
      const variable = matchAt(input, pos, /\$\{[^}]*\}|\$\([^)]*\)|\$[A-Za-z_][A-Za-z0-9_]*/y);
      if (variable) {
        sink.push("property", variable);
        commandPosition = false;
        pos += variable.length;
        continue;
      }
    }
    const separator = matchAt(input, pos, /&&|\|\||[;|<>]=?|>>/y);
    if (separator) {
      sink.push("punctuation", separator);
      commandPosition = true;
      pos += separator.length;
      continue;
    }
    if (ch === "-") {
      const flag = matchAt(input, pos, /--[A-Za-z][A-Za-z0-9-]*|-[A-Za-z][A-Za-z0-9]*/y);
      if (flag) {
        sink.push("property", flag);
        commandPosition = false;
        pos += flag.length;
        continue;
      }
    }
    const number = matchAt(input, pos, /\d+(?:\.\d+)?/y);
    if (number) {
      sink.push("static", number);
      commandPosition = false;
      pos += number.length;
      continue;
    }
    if (IDENTIFIER_START.test(ch) || ch === "." || ch === "/") {
      const word = readWord(input, pos, /[A-Za-z0-9_./-]/y);
      if (commandPosition && !BASH_STATIC_WORDS.has(word)) {
        sink.push("keyword", word);
      } else if (BASH_STATIC_WORDS.has(word)) {
        sink.push("static", word);
      } else {
        sink.push("plain", word);
      }
      commandPosition = false;
      pos += word.length;
      continue;
    }
    if (ch === "=") {
      sink.push("punctuation", ch);
      pos += 1;
      continue;
    }
    sink.push("plain", ch);
    commandPosition = false;
    pos += 1;
  }
}

function tokenizeMarkdown(input: string, sink: TokenSink): void {
  let pos = 0;
  let inFence = false;
  while (pos < input.length) {
    const lineEnd = input.indexOf("\n", pos);
    const lineLimit = lineEnd === -1 ? input.length : lineEnd;
    const line = input.slice(pos, lineLimit);
    if (/^```/.test(line)) {
      const fence = matchAt(input, pos, /`+/y) ?? "```";
      sink.push("punctuation", fence);
      const rest = input.slice(pos + fence.length, lineLimit);
      if (rest.length > 0) sink.push("plain", rest);
      inFence = !inFence;
    } else if (inFence) {
      if (line.length > 0) sink.push("plain", line);
    } else {
      const heading = matchAt(input, pos, /#{1,6}/y);
      if (heading) {
        sink.push("keyword", heading);
        pos += heading.length;
      }
      while (pos < lineLimit) {
        const ch = input[pos] ?? "";
        if (ch === "`") {
          const end = input.indexOf("`", pos + 1);
          if (end !== -1 && end < lineLimit) {
            sink.push("string", input.slice(pos, end + 1));
            pos = end + 1;
            continue;
          }
        }
        if (ch === "*" || ch === "_") {
          const run = matchAt(input, pos, /[*_]+/y);
          if (run) {
            sink.push("punctuation", run);
            pos += run.length;
            continue;
          }
        }
        if (ch === "]" && input[pos + 1] === "(") {
          sink.push("punctuation", "](");
          pos += 2;
          const close = input.indexOf(")", pos);
          const limit = close === -1 || close > lineLimit ? lineLimit : close;
          if (limit > pos) {
            sink.push("string", input.slice(pos, limit));
            pos = limit;
          }
          continue;
        }
        if (ch === "[" || ch === ")") {
          sink.push("punctuation", ch);
          pos += 1;
          continue;
        }
        if (ch === ">" && pos === lineLimit - line.length) {
          sink.push("punctuation", ch);
          pos += 1;
          continue;
        }
        let end = pos + 1;
        while (end < lineLimit) {
          const peek = input[end] ?? "";
          if (peek === "`" || peek === "*" || peek === "_" || peek === "[" || peek === "]" || peek === ")") {
            break;
          }
          end += 1;
        }
        sink.push("plain", input.slice(pos, end));
        pos = end;
      }
    }
    if (lineEnd === -1) {
      pos = input.length;
    } else {
      sink.push("plain", "\n");
      pos = lineEnd + 1;
    }
  }
}

/**
 * Tokenize a literal source string for the declared language. Pure and
 * deterministic; unknown languages degrade to a single plain run. The empty
 * input yields no tokens.
 *
 * The signature is `string`-typed, but the DOM boundary does not guarantee
 * it: generated components lower required props straight into this call,
 * and a consumer that omits one delivers `undefined` (template engines
 * tolerate exactly that when interpolating). The runtime is therefore
 * TOTAL at the boundary — `undefined`/`null` code coerces to the empty
 * string (no tokens, matching how an omitted prop previously rendered
 * empty), and a missing language falls into the unknown-language plain
 * run — instead of throwing inside render.
 */
export function tokenizeCode(code: string, language: string): HighlightToken[] {
  const source = code ?? "";
  const lang = language ?? "";
  const collected: HighlightToken[] = [];
  const sink: TokenSink = {
    push(kind, text) {
      if (text.length === 0) return;
      collected.push({ kind, text });
    },
  };
  switch (lang) {
    case "javascript":
      tokenizeJsFamily(source, sink, { jsx: false, typescript: false });
      break;
    case "jsx":
      tokenizeJsFamily(source, sink, { jsx: true, typescript: false });
      break;
    case "typescript":
      tokenizeJsFamily(source, sink, { jsx: false, typescript: true });
      break;
    case "tsx":
      tokenizeJsFamily(source, sink, { jsx: true, typescript: true });
      break;
    case "json":
      tokenizeJson(source, sink);
      break;
    case "css":
      tokenizeCss(source, sink);
      break;
    case "html":
      tokenizeHtml(source, sink);
      break;
    case "svelte":
    case "vue":
      tokenizeSingleFileComponent(source, sink);
      break;
    case "bash":
      tokenizeBash(source, sink);
      break;
    case "markdown":
      tokenizeMarkdown(source, sink);
      break;
    default:
      if (source.length > 0) sink.push("plain", source);
      break;
  }
  const merged: HighlightToken[] = [];
  for (const token of collected) {
    const last = merged[merged.length - 1];
    if (last && last.kind === token.kind) {
      merged[merged.length - 1] = { kind: last.kind, text: last.text + token.text };
    } else {
      merged.push(token);
    }
  }
  return merged;
}
