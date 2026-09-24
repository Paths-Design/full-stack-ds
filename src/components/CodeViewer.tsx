import { useMemo, useRef, useEffect, useState } from "react";
import { Card, Button, CodeBlock, Stack, Toast, Tooltip  } from "@full-stack-ds/react";
import type { CodeBlockLanguage } from "@full-stack-ds/react";
import {
  tokenizeCode,
  type HighlightToken,
} from "../../packages/ds-react/src/primitives/highlight/tokenize";
import type { TraceHit } from "../trace/types";

interface CodeViewerProps {
  code: string;
  filename?: string;
  hits?: TraceHit[];
  onHitClick?: (hit: TraceHit) => void;
  selectedHitIndex?: number | null;
}

interface Segment {
  text: string;
  hit?: TraceHit;
  hitIndex?: number;
}

interface HighlightedSegment extends Segment {
  tokens: HighlightToken[];
}

const SOURCE_LANGUAGES: Record<string, CodeBlockLanguage> = {
  bash: "bash",
  css: "css",
  cjs: "javascript",
  htm: "html",
  html: "html",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  mjs: "javascript",
  md: "markdown",
  scss: "css",
  sh: "bash",
  svelte: "html",
  ts: "typescript",
  tsx: "tsx",
  vue: "html",
};

function languageForFilename(filename?: string): CodeBlockLanguage {
  const extension = filename?.split(".").pop()?.toLowerCase() ?? "";
  return SOURCE_LANGUAGES[extension] ?? "plaintext";
}

// Tokenize the whole file first so multiline strings and comments keep the
// same lexical state as CodeBlock's unannotated rendering.
function tokensByLine(code: string, language: CodeBlockLanguage): HighlightToken[][] {
  const lines: HighlightToken[][] = [[]];
  for (const token of tokenizeCode(code, language)) {
    token.text.split("\n").forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind: token.kind, text: part });
    });
  }
  return lines;
}

function tokensInRange(tokens: HighlightToken[], start: number, end: number): HighlightToken[] {
  const range: HighlightToken[] = [];
  let offset = 0;
  for (const token of tokens) {
    const tokenEnd = offset + token.text.length;
    const from = Math.max(start, offset);
    const to = Math.min(end, tokenEnd);
    if (to > from) {
      range.push({ kind: token.kind, text: token.text.slice(from - offset, to - offset) });
    }
    offset = tokenEnd;
  }
  return range;
}

function renderTokens(tokens: HighlightToken[]) {
  return tokens.map((token, index) => (
    <span key={index} className="code-block__token" data-token={token.kind}>
      {token.text}
    </span>
  ));
}

function segmentLine(line: string, lineHits: { hit: TraceHit; index: number; col: number; len: number }[]): Segment[] {
  if (lineHits.length === 0) return [{ text: line }];
  const sorted = [...lineHits].sort((a, b) => a.col - b.col);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.col < cursor) continue;
    if (h.col > cursor) segments.push({ text: line.slice(cursor, h.col) });
    const endCol = Math.min(line.length, h.col + h.len);
    segments.push({ text: line.slice(h.col, endCol), hit: h.hit, hitIndex: h.index });
    cursor = endCol;
  }
  if (cursor < line.length) segments.push({ text: line.slice(cursor) });
  return segments;
}

export function CodeViewer({ code, filename, hits = [], onHitClick, selectedHitIndex }: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const language = languageForFilename(filename);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable (permissions/older embeds) — the toast simply never fires
    }
  };

  const lines = useMemo(() => {
    const raw = code.split("\n");
    const highlighted = tokensByLine(code, language);
    const byLine: Record<number, { hit: TraceHit; index: number; col: number; len: number }[]> = {};
    hits.forEach((h, idx) => {
      const line = h.start.line;
      if (!byLine[line]) byLine[line] = [];
      byLine[line].push({ hit: h, index: idx, col: h.start.column, len: h.length });
    });
    return raw.map((text, i) => {
      let offset = 0;
      const segments: HighlightedSegment[] = segmentLine(text, byLine[i] ?? []).map((segment) => {
        const start = offset;
        offset += segment.text.length;
        return {
          ...segment,
          tokens: tokensInRange(highlighted[i] ?? [], start, offset),
        };
      });
      return { lineNumber: i + 1, segments };
    });
  }, [code, hits, language]);

  useEffect(() => {
    if (selectedHitIndex == null || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-hit-index="${selectedHitIndex}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedHitIndex]);

  return (
    <Card className="showcase-card">
      {filename && (
        <Stack variant="horizontal" className="panel-toolbar stack-gap-00">
          <Stack variant="horizontal" className="stack-gap-04" style={{ alignItems: "baseline" }}>
            <span>{filename}</span>
            <span className="subtle">{code.split("\n").length} lines</span>
          </Stack>
          <Button variant="ghost" size="small" ariaLabel="Copy code to clipboard" onClick={copyCode}>
            Copy
          </Button>
        </Stack>
      )}
      <Toast
        open={copied}
        onOpenChange={setCopied}
        title="Copied to clipboard"
        variant="success"
        duration={2500}
      >
        {filename ?? "Source"}
      </Toast>
      <div ref={containerRef}>
        <CodeBlock className="source-viewer__code" code={code} language={language}>
          {lines.map(({ lineNumber, segments }) => (
            <Stack as="span" key={lineNumber} variant="horizontal" className="source-viewer__line stack-gap-00">
              <span
                className="subtle"
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 36,
                  flexShrink: 0,
                  textAlign: "right",
                  paddingRight: 12,
                  userSelect: "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {lineNumber}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {segments.map((seg, idx) =>
                  seg.hit ? (
                    <Tooltip key={idx} placement="top" className="source-viewer__trace">
                      <Tooltip.Trigger asChild>
                        <Button
                          variant="ghost"
                          className="source-viewer__annotation"
                          data-hit-index={seg.hitIndex}
                          data-selected={selectedHitIndex === seg.hitIndex}
                          onClick={() => onHitClick?.(seg.hit!)}
                        >
                          {renderTokens(seg.tokens)}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <strong>{seg.hit.kind}</strong> → {seg.hit.contractPath}
                        {seg.hit.explanation ? ` — ${seg.hit.explanation}` : ""}
                      </Tooltip.Content>
                    </Tooltip>
                  ) : (
                    <span key={idx}>{seg.text ? renderTokens(seg.tokens) : "​"}</span>
                  ),
                )}
              </span>
            </Stack>
          ))}
        </CodeBlock>
      </div>
    </Card>
  );
}
