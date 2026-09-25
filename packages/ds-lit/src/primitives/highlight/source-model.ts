export type HighlightTokenKind =
  | "comment" | "definition" | "keyword" | "plain" | "property"
  | "punctuation" | "static" | "string" | "tag";

export interface HighlightToken {
  readonly kind: HighlightTokenKind;
  readonly text: string;
}

export interface HighlightLine {
  readonly number: number;
  readonly tokens: readonly HighlightToken[];
  readonly ending: string;
  readonly highlighted: boolean;
}

export interface HighlightSource {
  readonly lines: readonly HighlightLine[];
  readonly highlighted: boolean;
}

const KINDS: ReadonlySet<string> = new Set([
  "comment", "definition", "keyword", "plain", "property",
  "punctuation", "static", "string", "tag",
]);

/** Validate supplied source before rendering and preserve every line ending. */
export function prepareSourceLines(
  code: string,
  supplied?: readonly HighlightToken[] | null,
  highlight = true,
): HighlightSource {
  const source = code ?? "";
  const valid = supplied !== undefined && supplied !== null &&
    Array.isArray(supplied) &&
    supplied.every((token) => token && typeof token.text === "string" && KINDS.has(token.kind)) &&
    supplied.map((token) => token.text).join("") === source;
  const highlighted = highlight && valid;
  const tokens: readonly HighlightToken[] = highlighted
    ? supplied as readonly HighlightToken[]
    : [{ kind: "plain", text: source }];
  const lines: HighlightLine[] = [];
  let fragments: HighlightToken[] = [];
  let tokenIndex = 0;
  let tokenOffset = 0;
  const consume = (length: number, collect: boolean): void => {
    while (length > 0 && tokenIndex < tokens.length) {
      const token = tokens[tokenIndex];
      const available = token.text.length - tokenOffset;
      if (available === 0) { tokenIndex++; tokenOffset = 0; continue; }
      const count = Math.min(length, available);
      if (collect) fragments.push({ kind: token.kind, text: token.text.slice(tokenOffset, tokenOffset + count) });
      tokenOffset += count;
      length -= count;
    }
  };
  let sourceOffset = 0;
  for (const match of source.matchAll(/\r?\n/g)) {
    consume(match.index - sourceOffset, true);
    consume(match[0].length, false);
    lines.push({ number: lines.length + 1, tokens: fragments, ending: match[0], highlighted });
    fragments = [];
    sourceOffset = match.index + match[0].length;
  }
  consume(source.length - sourceOffset, true);
  lines.push({ number: lines.length + 1, tokens: fragments, ending: "", highlighted });
  return { lines, highlighted };
}
