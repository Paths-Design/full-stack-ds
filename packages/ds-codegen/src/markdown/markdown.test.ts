/**
 * Canonical markdown parser tests (FEAT-MARKDOWN-CONTENT-TRANSFORM-01).
 *
 * Pins the invariants the transform's security and identity claims rest
 * on: purity/determinism, the closed v1 grammar, literal-HTML doctrine,
 * href protocol sanitization, and degradation of unterminated input.
 * The frozen golden fixtures are the cross-framework identity baseline
 * the per-package parser tests assert against.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMarkdown,
  parseMarks,
  sanitizeHref,
  collectMarkdownText,
  type MarkdownBlock,
} from "./markdown.js";

describe("parseMarkdown — blocks", () => {
  it("empty and blank-only input yields no blocks", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n  \n")).toEqual([]);
  });

  it("parses ATX heading levels 1-6", () => {
    for (let level = 1; level <= 6; level += 1) {
      const blocks = parseMarkdown(`${"#".repeat(level)} Title`);
      expect(blocks).toEqual([
        { kind: "heading", level, children: [{ kind: "text", text: "Title" }] },
      ]);
    }
  });

  it("soft-wraps contiguous paragraph lines with a single space", () => {
    const blocks = parseMarkdown("line one\nline two\nline three");
    expect(blocks).toEqual([
      { kind: "paragraph", children: [{ kind: "text", text: "line one line two line three" }] },
    ]);
  });

  it("parses contiguous unordered and ordered list runs", () => {
    const blocks = parseMarkdown("- a\n- b\n\n1. first\n2) second");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      kind: "list",
      ordered: false,
      items: [
        { kind: "listItem", children: [{ kind: "text", text: "a" }] },
        { kind: "listItem", children: [{ kind: "text", text: "b" }] },
      ],
    });
    const orderedList = blocks[1];
    expect(orderedList).toMatchObject({ kind: "list", ordered: true });
    expect(orderedList?.kind === "list" && orderedList.items).toHaveLength(2);
  });

  it("fenced code blocks carry the info string as language and raw text", () => {
    const blocks = parseMarkdown("```ts\nconst x = 1;\nconst y = *not-emphasis*;\n```");
    expect(blocks).toEqual([
      { kind: "codeBlock", language: "ts", text: "const x = 1;\nconst y = *not-emphasis*;" },
    ]);
  });

  it("unterminated fences degrade to end of input", () => {
    const blocks = parseMarkdown("```json\n{\"a\": 1}");
    expect(blocks).toEqual([{ kind: "codeBlock", language: "json", text: "{\"a\": 1}" }]);
  });

  it("blockquotes join their lines and parse marks once", () => {
    const blocks = parseMarkdown("> quoted *text*\n> more");
    expect(blocks).toEqual([
      {
        kind: "blockquote",
        children: [
          { kind: "text", text: "quoted " },
          { kind: "emphasis", children: [{ kind: "text", text: "text" }] },
          { kind: "text", text: " more" },
        ],
      },
    ]);
  });
});

describe("parseMarks — inline grammar", () => {
  it("code spans take precedence: markers inside are literal", () => {
    expect(parseMarks("a `*b* [c](d)` e")).toEqual([
      { kind: "text", text: "a " },
      { kind: "code", text: "*b* [c](d)" },
      { kind: "text", text: " e" },
    ]);
  });

  it("strong and emphasis work with both marker families and nest across kinds", () => {
    expect(parseMarks("**bold _inner_**")).toEqual([
      {
        kind: "strong",
        children: [
          { kind: "text", text: "bold " },
          { kind: "emphasis", children: [{ kind: "text", text: "inner" }] },
        ],
      },
    ]);
    expect(parseMarks("__also strong__")).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "also strong" }] },
    ]);
  });

  it("unmatched markers render literally", () => {
    expect(parseMarks("2 * 3 = 6 and _dangling")).toEqual([
      { kind: "text", text: "2 * 3 = 6 and _dangling" },
    ]);
  });

  it("backslash escapes the markdown specials", () => {
    expect(parseMarks("\\*not emphasis\\*")).toEqual([
      { kind: "text", text: "*not emphasis*" },
    ]);
    expect(parseMarks("a \\\\ b")).toEqual([{ kind: "text", text: "a \\ b" }]);
  });

  it("links recurse into their label and sanitize at parse time", () => {
    expect(parseMarks("[**bold** link](https://example.com)")).toEqual([
      {
        kind: "link",
        href: "https://example.com",
        children: [
          { kind: "strong", children: [{ kind: "text", text: "bold" }] },
          { kind: "text", text: " link" },
        ],
      },
    ]);
  });
});

describe("sanitizeHref", () => {
  it("allows http, https, mailto, anchors, and relative URLs", () => {
    expect(sanitizeHref("https://example.com/a?b=c")).toBe("https://example.com/a?b=c");
    expect(sanitizeHref("http://example.com")).toBe("http://example.com");
    expect(sanitizeHref("mailto:a@b.example")).toBe("mailto:a@b.example");
    expect(sanitizeHref("#anchor")).toBe("#anchor");
    expect(sanitizeHref("/absolute/path")).toBe("/absolute/path");
    expect(sanitizeHref("./relative")).toBe("./relative");
    expect(sanitizeHref("  https://padded.example  ")).toBe("https://padded.example");
  });

  it("rejects script-y schemes and empty targets", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(sanitizeHref("data:text/html,<b>")).toBeNull();
    expect(sanitizeHref("vbscript:x")).toBeNull();
    expect(sanitizeHref("unknown-scheme:whatever")).toBeNull();
    expect(sanitizeHref("   ")).toBeNull();
  });

  it.each(["\t", "\n", "\r", "\r\n"])("classifies schemes after ASCII tab/newline preprocessing (%j)", control => {
    for (const scheme of ["custom", "javascript", "data", "vbscript"]) {
      const target = scheme.slice(0, 2) + control + scheme.slice(2) + ":unused";
      expect(new URL(target, "https://base.example/").protocol).toBe(scheme + ":");
      expect(sanitizeHref(target), target).toBeNull();
    }
    expect(sanitizeHref("ht" + control + "tps://example.com/path")).toBe("https://example.com/path");
    expect(sanitizeHref("ma" + control + "ilto:a@example.com")).toBe("mailto:a@example.com");
  });

  it.each(Array.from({ length: 33 }, (_, point) => point))("handles URL edge code point %i before admission", point => {
    const edge = String.fromCharCode(point);
    const target = edge + "custom:unused" + edge;
    expect(new URL(target, "https://base.example/").protocol).toBe("custom:");
    expect(sanitizeHref(target)).toBeNull();
    expect(sanitizeHref(edge + "https://example.com/path" + edge)).toBe("https://example.com/path");
  });

  it("preserves relative, query, fragment, encoded and Unicode URL content", () => {
    for (const target of ["?q=hello world", "#عنوان", "./café/日本語", "cu%09stom:sample", "cu\u0001stom:sample", "cust\u200bom:sample", "./\u00a0name"]) {
      expect(new URL(target, "https://base.example/").protocol).toBe("https:");
      expect(sanitizeHref(target), target).toBe(target);
    }
  });

  it("rejects a control-only target after URL preprocessing", () => {
    expect(sanitizeHref("\u0000\t\r \u001f")).toBeNull();
  });
});

describe("security doctrine", () => {
  it("raw HTML is never interpreted — hostile markup arrives as literal text", () => {
    const hostile = "# <img src=x onerror=alert(1)>\n\nText with <script>alert(1)</script> inside.";
    const text = collectMarkdownText(parseMarkdown(hostile));
    expect(text).toContain("<img src=x onerror=alert(1)>");
    expect(text).toContain("<script>alert(1)</script>");
  });

  it("javascript: links degrade to href:null with literal child text", () => {
    const marks = parseMarks("[click](javascript:alert(1))");
    expect(marks).toEqual([
      { kind: "link", href: null, children: [{ kind: "text", text: "click" }] },
    ]);
  });

  it.each(["cu\tstom:unused", "\u0000custom:unused", "\u001fCuStOm:unused"])("degrades normalized unsupported document targets without losing labels (%j)", target => {
    expect(parseMarks(`[**نص 日本語**](${target})`)).toEqual([
      { kind: "link", href: null, children: [{ kind: "strong", children: [{ kind: "text", text: "نص 日本語" }] }] },
    ]);
    expect(collectMarkdownText(parseMarkdown(`[نص 日本語](${target})`))).toBe("نص 日本語");
  });
});

describe("invariants", () => {
  it("is pure and deterministic: identical input yields an identical tree", () => {
    const doc = "# H\n\n- a *b*\n\n```x\ny\n```\n";
    const first = JSON.stringify(parseMarkdown(doc));
    for (let i = 0; i < 3; i += 1) {
      expect(JSON.stringify(parseMarkdown(doc))).toBe(first);
    }
  });

  it("normalizes CRLF line endings before parsing", () => {
    expect(parseMarkdown("a\r\nb")).toEqual(
      parseMarkdown("a\nb"),
    );
  });
});

describe("golden fixtures (cross-framework identity baseline)", () => {
  it("matches every frozen golden tree", () => {
    const fixturePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "fixtures.json",
    );
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      cases: { name: string; source: string; expected: MarkdownBlock[] }[];
    };
    for (const testCase of fixture.cases) {
      expect(
        parseMarkdown(testCase.source),
        `golden tree for ${testCase.name}`,
      ).toEqual(testCase.expected);
    }
  });
});
