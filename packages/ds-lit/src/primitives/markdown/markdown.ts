/**
 * Canonical markdown parser for the markdown content transform
 * (FEAT-MARKDOWN-CONTENT-TRANSFORM-01).
 *
 * The single-source structural parser backing the second admitted content
 * transform. Like the highlight tokenizer, it is pure, synchronous, and
 * deterministic (SSR-safe): same input, same tree, every target. Codegen
 * emits this module byte-identical into every web framework package at
 * `primitives/markdown/markdown.ts`.
 *
 * V1 grammar — a closed, honest subset (each omission is a recorded
 * follow-up, not a silent gap):
 *
 *   Blocks:  ATX headings (#..######), paragraphs (soft-wrapped lines
 *            joined with a single space), ordered + unordered lists
 *            (single level, contiguous same-marker runs), fenced code
 *            blocks (``` only, info string = language), blockquotes
 *            (single level, content treated as one paragraph).
 *   Marks:   code spans (`…`), links […](…), strong (**…** / __…__),
 *            emphasis (*…* / _…_). First-closer matching; no same-kind
 *            nesting inside a span in v1. Backslash escapes the markdown
 *            specials.
 *
 * Security doctrine (the point of this module's existence):
 *
 *   - Raw HTML is NEVER interpreted. There is no inline-HTML node kind;
 *     markup-shaped text arrives as literal `text` marks, exactly as
 *     authored. Emitters render text nodes as text content only.
 *   - Link hrefs are protocol-sanitized at parse time: http, https,
 *     mailto, anchors, and relative URLs pass; anything else (javascript:,
 *     data:, unknown schemes) yields href:null and the emitter degrades
 *     the link to its literal child text. The scheme decision lives here,
 *     once — never per framework.
 *
 * Unknown constructs degrade: unterminated fences run to end of input,
 * unmatched markers render literally, blank input yields no blocks.
 */

// ---------------------------------------------------------------------------
// Public types — the closed output vocabulary.
// ---------------------------------------------------------------------------

export type MarkdownMarkKind = "text" | "code" | "emphasis" | "strong" | "link";

export type MarkdownMark =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "emphasis"; children: MarkdownMark[] }
  | { kind: "strong"; children: MarkdownMark[] }
  /** href === null means the URL failed protocol sanitization: render the
   *  children as literal text and drop the link affordance. */
  | { kind: "link"; href: string | null; children: MarkdownMark[] };

export type MarkdownBlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "listItem"
  | "codeBlock"
  | "blockquote";

export type MarkdownBlock =
  | { kind: "heading"; level: number; children: MarkdownMark[] }
  | { kind: "paragraph"; children: MarkdownMark[] }
  | { kind: "list"; ordered: boolean; items: MarkdownBlock[] }
  | { kind: "listItem"; children: MarkdownMark[] }
  | { kind: "codeBlock"; language: string; text: string }
  | { kind: "blockquote"; children: MarkdownMark[] };

// ---------------------------------------------------------------------------
// Link sanitization.
// ---------------------------------------------------------------------------

const SAFE_HREF_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Protocol-sanitize a link target. Allowed: http/https/mailto URLs,
 * anchors (#…), and relative URLs (no scheme). Rejected: every other
 * scheme (javascript:, data:, vbscript:, …) and anything that looks like
 * a scheme but is not on the allowlist. Query-only and fragment-only
 * strings count as relative and pass.
 */
export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  // Preserve existing edge-whitespace handling, then apply the URL parser's
  // C0/space edge trim and ASCII tab/newline removal before classifying schemes.
  // https://url.spec.whatwg.org/#concept-basic-url-parser
  let start = 0;
  let end = trimmed.length;
  while (start < end && trimmed.charCodeAt(start) <= 0x20) start += 1;
  while (end > start && trimmed.charCodeAt(end - 1) <= 0x20) end -= 1;
  const normalized = trimmed.slice(start, end).replace(/[\t\n\r]/g, "");
  if (normalized === "") return null;
  // A scheme is `letters [letters/digits/+/./-]* :` at the start.
  const schemeMatch = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(normalized);
  if (schemeMatch) {
    return SAFE_HREF_PROTOCOLS.has(schemeMatch[0].toLowerCase())
      ? normalized
      : null;
  }
  // No scheme: anchor, query, or relative path — safe by construction.
  return normalized;
}

// ---------------------------------------------------------------------------
// Inline (mark) parsing.
// ---------------------------------------------------------------------------

/** Markdown specials escapable with a backslash. */
const ESCAPABLE = new Set([
  "`",
  "*",
  "_",
  "[",
  "]",
  "(",
  ")",
  "#",
  "!",
  ">",
  "-",
  "\\",
]);

/**
 * Parse one inline span into marks. Left-to-right, first-closer matching:
 * a run opens at its first marker character and closes at the next
 * occurrence of the same marker run; content between recurses. Unmatched
 * openers and bare markers render literally. Code spans take precedence:
 * their content is never further parsed.
 */
export function parseMarks(input: string): MarkdownMark[] {
  const marks: MarkdownMark[] = [];
  let text = "";
  const flushText = (): void => {
    if (text.length > 0) {
      marks.push({ kind: "text", text });
      text = "";
    }
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (ch === "\\") {
      const next = input[i + 1];
      if (next !== undefined && ESCAPABLE.has(next)) {
        text += next;
        i += 2;
        continue;
      }
      text += "\\";
      i += 1;
      continue;
    }

    if (ch === "`") {
      const closer = input.indexOf("`", i + 1);
      if (closer !== -1) {
        flushText();
        marks.push({ kind: "code", text: input.slice(i + 1, closer) });
        i = closer + 1;
        continue;
      }
      text += ch;
      i += 1;
      continue;
    }

    if (ch === "[") {
      const closeBracket = findLinkEnd(input, i);
      if (closeBracket !== null) {
        flushText();
        const inner = input.slice(i + 1, closeBracket.labelEnd);
        marks.push({
          kind: "link",
          href: sanitizeHref(input.slice(closeBracket.hrefStart, closeBracket.hrefEnd)),
          children: parseMarks(inner),
        });
        i = closeBracket.after;
        continue;
      }
      text += ch;
      i += 1;
      continue;
    }

    if (ch === "*" || ch === "_") {
      // Double-marker runs open strong; a trailing same-marker character
      // means a longer run (v1 has no triple semantics — literal).
      const isDouble = input[i + 1] === ch && input[i + 2] !== ch;
      // Intraword single underscores do not emphasize (snake_case stays
      // literal): a single `_` opens only when the preceding character
      // is not a word character. `*` has no such restriction.
      const intrawordUnderscore =
        ch === "_" && !isDouble && i > 0 && /\w/.test(input[i - 1]!);
      const runLength = isDouble ? 2 : 1;
      const closer = intrawordUnderscore
        ? -1
        : findRunCloser(input, i + runLength, ch, runLength);
      if (closer !== -1) {
        flushText();
        const inner = input.slice(i + runLength, closer);
        marks.push(
          runLength === 2
            ? { kind: "strong", children: parseMarks(inner) }
            : { kind: "emphasis", children: parseMarks(inner) },
        );
        i = closer + runLength;
        continue;
      }
      text += ch;
      i += 1;
      continue;
    }

    text += ch;
    i += 1;
  }

  flushText();
  return marks.length > 0 ? marks : [];
}

/**
 * Find the closing run of `marker` at exactly `length` characters,
 * starting after the opener. First occurrence wins (v1: no same-kind
 * nesting — `**a **b** c` closes at the first `**`).
 */
function findRunCloser(
  input: string,
  from: number,
  marker: string,
  length: number,
): number {
  for (let i = from; i + length <= input.length; i += 1) {
    if (input[i] !== marker) continue;
    let matches = true;
    for (let k = 1; k < length; k += 1) {
      if (input[i + k] !== marker) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // A longer run (*** for **) is not a valid closer in v1.
      if (input[i + length] === marker) continue;
      return i;
    }
  }
  return -1;
}

interface LinkEnd {
  labelEnd: number;
  hrefStart: number;
  hrefEnd: number;
  after: number;
}

/** Find `](…)` starting from an opening `[`, or null when malformed.
 *  The href may contain one level of balanced parentheses (CommonMark
 *  URL shape, e.g. `https://x.example/a(b)`), so the scan tracks depth
 *  instead of stopping at the first `)`. */
function findLinkEnd(input: string, open: number): LinkEnd | null {
  // The label may not contain an unescaped ] — scan with escape awareness.
  let i = open + 1;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "]") break;
    i += 1;
  }
  if (i >= input.length || input[i] !== "]") return null;
  if (input[i + 1] !== "(") return null;
  const hrefStart = i + 2;
  let j = hrefStart;
  let depth = 0;
  while (j < input.length) {
    const ch = input[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      j += 1;
      continue;
    }
    if (ch === ")") {
      if (depth === 0) break;
      depth -= 1;
      j += 1;
      continue;
    }
    j += 1;
  }
  if (j >= input.length || input[j] !== ")") return null;
  return { labelEnd: i, hrefStart, hrefEnd: j, after: j + 1 };
}

// ---------------------------------------------------------------------------
// Block parsing.
// ---------------------------------------------------------------------------

const FENCE_RE = /^```(.*)$/;
const HEADING_RE = /^(#{1,6})(?:\s+(.*))?$/;
const UL_ITEM_RE = /^[-*+]\s+(.*)$/;
const OL_ITEM_RE = /^\d{1,9}[.)]\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;

/**
 * Parse a markdown document into blocks. Line-oriented: fenced code,
 * headings, list runs, blockquote runs, then contiguous paragraph lines
 * (soft-wrapped with a single space). Blank lines separate; leading and
 * trailing blanks are ignored; empty input yields no blocks.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = (source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  const isBlank = (idx: number): boolean =>
    idx < lines.length && lines[idx]!.trim() === "";

  while (i < lines.length) {
    if (isBlank(i)) {
      i += 1;
      continue;
    }

    const line = lines[i]!;

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const language = fence[1]!.trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) {
        body.push(lines[i]!);
        i += 1;
      }
      // Unterminated fence degrades to end-of-input (i === lines.length).
      if (i < lines.length) i += 1; // consume the closing fence
      blocks.push({ kind: "codeBlock", language, text: body.join("\n") });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading && heading[2] !== undefined) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        children: parseMarks(heading[2]!),
      });
      i += 1;
      continue;
    }

    const quoted = QUOTE_RE.exec(line);
    if (quoted) {
      const content: string[] = [quoted[1]!];
      i += 1;
      while (i < lines.length) {
        const next = QUOTE_RE.exec(lines[i]!);
        if (!next) break;
        content.push(next[1]!);
        i += 1;
      }
      blocks.push({
        kind: "blockquote",
        children: parseMarks(content.join(" ")),
      });
      continue;
    }

    const ul = UL_ITEM_RE.exec(line);
    const ol = ul ? null : OL_ITEM_RE.exec(line);
    if (ul || ol) {
      const ordered = ol !== null;
      const itemRe = ordered ? OL_ITEM_RE : UL_ITEM_RE;
      const items: MarkdownBlock[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]!);
        if (!m) break;
        items.push({ kind: "listItem", children: parseMarks(m[1]!) });
        i += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Paragraph: contiguous lines that are not blank and do not open
    // another block construct.
    const para: string[] = [];
    while (i < lines.length && !isBlank(i)) {
      const l = lines[i]!;
      if (
        FENCE_RE.test(l) ||
        (HEADING_RE.exec(l)?.[2] !== undefined) ||
        QUOTE_RE.test(l) ||
        UL_ITEM_RE.test(l) ||
        OL_ITEM_RE.test(l)
      ) {
        break;
      }
      para.push(l);
      i += 1;
    }
    blocks.push({
      kind: "paragraph",
      children: parseMarks(para.join(" ")),
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Tree utilities shared by tests and per-package identity checks.
// ---------------------------------------------------------------------------

/**
 * Concatenate every literal text payload in the tree, in document order.
 * Injection tests use this: the concatenated text must contain hostile
 * markup characters exactly as authored (they were never interpreted).
 */
export function collectMarkdownText(node: unknown): string {
  const out: string[] = [];
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const child of n) visit(child);
      return;
    }
    if (!n || typeof n !== "object") return;
    const typed = n as Record<string, unknown>;
    if (typeof typed.text === "string") out.push(typed.text);
    if (Array.isArray(typed.children)) visit(typed.children);
    if (Array.isArray(typed.items)) visit(typed.items);
  };
  visit(node);
  return out.join("");
}
