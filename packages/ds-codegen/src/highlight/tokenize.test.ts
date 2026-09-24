import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tokenizeCode } from "./tokenize.js";
import type { HighlightToken, HighlightTokenKind } from "./tokenize.js";

const KIND_ENUM: readonly HighlightTokenKind[] = [
  "comment",
  "definition",
  "keyword",
  "plain",
  "property",
  "punctuation",
  "static",
  "string",
  "tag",
];

const CASES: { language: string; code: string }[] = [
  {
    language: "typescript",
    code: 'export function sum(values: number[]) {\n  // fold to total\n  return values.reduce((total, value) => total + value, 0);\n}\nconst ok: boolean = true;',
  },
  {
    language: "tsx",
    code: 'import { Button } from "@full-stack-ds/react";\nexport function App() {\n  return <Button disabled={false} variant="primary">Save</Button>;\n}',
  },
  {
    language: "jsx",
    code: 'function Card({ title }) {\n  return <div className="card">{title}</div>;\n}',
  },
  {
    language: "javascript",
    code: 'const x = 42;\nlet name = "fsds";\n/* block\ncomment */\nfn(x, 1.5e3, 0xff);',
  },
  {
    language: "json",
    code: '{\n  "name": "@full-stack-ds/react",\n  "private": true,\n  "version": 1,\n  "tags": ["a", "b"],\n  "ratio": -0.5\n}',
  },
  {
    language: "bash",
    code: '# install and build\npnpm install\npnpm run build --target=all\nexport TOKEN=$HOME/.token && echo "done" | tee log.txt',
  },
  {
    language: "css",
    code: '/* surface */\n.code-block {\n  background-color: var(--fsds-code-block-color-background);\n  padding: 16px 4px;\n  border-radius: 6px !important;\n}\n@media (max-width: 600px) {\n  .code-block { color: #0566fe; }\n}',
  },
  {
    language: "html",
    code: '<!DOCTYPE html>\n<!-- page -->\n<main class="app" data-x="y">\n  <h1>Title &amp; more</h1>\n</main>',
  },
  {
    language: "markdown",
    code: '# Heading\n\nSome **bold** and `inline` with a [link](https://example.com).\n\n```ts\nconst a = 1;\n```\n',
  },
  { language: "plaintext", code: 'raw output — <script>alert("x")</script> & done' },
  { language: "typescript", code: "" },
];

function roundTrip(tokens: HighlightToken[]): string {
  return tokens.map((token) => token.text).join("");
}

describe("tokenizeCode", () => {
  it("is lossless: token texts concatenate back to the exact input for every language", () => {
    for (const { language, code } of CASES) {
      expect(roundTrip(tokenizeCode(code, language)), `${language} round-trip`).toBe(code);
    }
  });

  it("stays inside the closed CodeBlockTokenType enum", () => {
    for (const { language, code } of CASES) {
      for (const token of tokenizeCode(code, language)) {
        expect(KIND_ENUM, `${language} kind ${token.kind}`).toContain(token.kind);
      }
    }
  });

  it("is deterministic: repeated runs produce identical streams", () => {
    for (const { language, code } of CASES) {
      expect(tokenizeCode(code, language)).toEqual(tokenizeCode(code, language));
    }
  });

  it("merges adjacent same-kind tokens and emits no empty tokens", () => {
    for (const { language, code } of CASES) {
      const tokens = tokenizeCode(code, language);
      for (let index = 1; index < tokens.length; index += 1) {
        expect(tokens[index]?.kind, `${language} merge at ${index}`).not.toBe(tokens[index - 1]?.kind);
      }
      for (const token of tokens) {
        expect(token.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("classifies typescript constructs", () => {
    const tokens = tokenizeCode(CASES[0]!.code, "typescript");
    const kindsBy = (text: string) => tokens.find((token) => token.text === text)?.kind;
    expect(kindsBy("export")).toBe("keyword");
    expect(kindsBy("function")).toBe("keyword");
    expect(kindsBy("return")).toBe("keyword");
    expect(kindsBy("const")).toBe("keyword");
    expect(kindsBy("sum")).toBe("definition");
    expect(kindsBy("reduce")).toBe("definition");
    expect(kindsBy("// fold to total")).toBe("comment");
    expect(kindsBy("0")).toBe("static");
    expect(kindsBy("true")).toBe("static");
    expect(kindsBy("boolean")).toBe("definition");
  });
  it("colors interface member names and string unions without coloring typed variables as properties", () => {
    const code = "interface Props {\n  layout?: 'stack' | 'inline';\n}\nconst layout: string = 'stack';";
    const tokens = tokenizeCode(code, "typescript");
    expect(roundTrip(tokens)).toBe(code);
    expect(tokens.some((token) => token.kind === "property" && token.text === "layout")).toBe(true);
    expect(tokens.some((token) => token.kind === "string" && token.text === "'stack'")).toBe(true);
    expect(tokens.some((token) => token.kind === "plain" && token.text.includes("layout"))).toBe(true);
  });
  it.each(["svelte", "vue"])("colors %s script, markup, and style with exact source round-trip", (language) => {
    const code = [
      "<!-- component -->",
      '<script lang="ts">',
      "interface Props {",
      "  layout?: 'stack' | 'inline';",
      "}",
      "</script>",
      '<div title="<script>">Ready</div>',
      "<style>",
      ".stack { color: red; }",
      "</style>",
    ].join("\n");
    const tokens = tokenizeCode(code, language);
    expect(roundTrip(tokens)).toBe(code);
    expect(tokens.some((token) => token.kind === "property" && token.text === "layout")).toBe(true);
    expect(tokens.some((token) => token.kind === "string" && token.text === "'stack'")).toBe(true);
    expect(tokens.some((token) => token.kind === "tag" && token.text === "div")).toBe(true);
    expect(tokens.some((token) => token.kind === "property" && token.text === "color")).toBe(true);
    expect(tokens.some((token) => token.kind === "string" && token.text === '"<script>"')).toBe(true);
  });
  it("colors Lit css and html tagged bodies and their expressions while leaving ordinary templates as strings", () => {
    const code = "const style = css`a { color: ${this.color}; }`;\nconst view = html`<slot name=${this.name}></slot>`;\nconst raw = `plain ${value}`;";
    const tokens = tokenizeCode(code, "typescript");
    expect(roundTrip(tokens)).toBe(code);
    expect(tokens.some((token) => token.kind === "property" && token.text === "color")).toBe(true);
    expect(tokens.some((token) => token.kind === "tag" && token.text === "slot")).toBe(true);
    expect(tokens.filter((token) => token.kind === "keyword" && token.text === "this")).toHaveLength(2);
    expect(tokens.some((token) => token.kind === "string" && token.text === "`plain ${value}`")).toBe(true);
  });

  it("classifies tsx markup: tags, attribute properties, strings, and text children", () => {
    const tokens = tokenizeCode(CASES[1]!.code, "tsx");
    const has = (kind: HighlightTokenKind, text: string) =>
      tokens.some((token) => token.kind === kind && token.text === text);
    expect(has("tag", "Button")).toBe(true);
    expect(has("property", "disabled")).toBe(true);
    expect(has("property", "variant")).toBe(true);
    expect(has("string", '"primary"')).toBe(true);
    expect(has("plain", "Save")).toBe(true);
    expect(has("definition", "App")).toBe(true);
  });

  it("distinguishes json object keys from string values", () => {
    const tokens = tokenizeCode(CASES[4]!.code, "json");
    const find = (text: string) => tokens.find((token) => token.text === text);
    expect(find('"name"')?.kind).toBe("property");
    expect(find('"@full-stack-ds/react"')?.kind).toBe("string");
    expect(find("true")?.kind).toBe("static");
    expect(find("1")?.kind).toBe("static");
    expect(find("-0.5")?.kind).toBe("static");
  });

  it("classifies bash comments, commands, flags, and variables", () => {
    const tokens = tokenizeCode(CASES[5]!.code, "bash");
    const find = (text: string) => tokens.find((token) => token.text === text);
    expect(find("# install and build")?.kind).toBe("comment");
    expect(find("pnpm")?.kind).toBe("keyword");
    expect(find("--target")?.kind).toBe("property");
    expect(find("$HOME")?.kind).toBe("property");
    expect(find('"done"')?.kind).toBe("string");
  });

  it("classifies css properties, values, at-rules, and hex colors", () => {
    const tokens = tokenizeCode(CASES[6]!.code, "css");
    const find = (text: string) => tokens.find((token) => token.text === text);
    expect(find("/* surface */")?.kind).toBe("comment");
    expect(find("background-color")?.kind).toBe("property");
    expect(find("--fsds-code-block-color-background")?.kind).toBe("property");
    expect(find("16px")?.kind).toBe("static");
    expect(find("@media")?.kind).toBe("keyword");
    expect(find("important")?.kind).toBe("keyword");
    expect(find("#0566fe")?.kind).toBe("static");
  });

  it("classifies html comments, doctype, tags, attributes, and entities", () => {
    const tokens = tokenizeCode(CASES[7]!.code, "html");
    const find = (text: string) => tokens.find((token) => token.text === text);
    expect(find("<!-- page -->")?.kind).toBe("comment");
    expect(find("<!DOCTYPE html>")?.kind).toBe("keyword");
    expect(find("main")?.kind).toBe("tag");
    expect(find("class")?.kind).toBe("property");
    expect(find('"app"')?.kind).toBe("string");
    expect(find("&amp;")?.kind).toBe("static");
  });

  it("classifies markdown headings, fences, inline code, and links", () => {
    const tokens = tokenizeCode(CASES[8]!.code, "markdown");
    const find = (text: string) => tokens.find((token) => token.text === text);
    expect(find("#")?.kind).toBe("keyword");
    expect(find("**")?.kind).toBe("punctuation");
    expect(find("`inline`")?.kind).toBe("string");
    expect(find("https://example.com")?.kind).toBe("string");
  });

  it("degrades plaintext and unknown languages to a single plain run", () => {
    const plain = tokenizeCode('a <b c="d"> & e', "plaintext");
    expect(plain).toEqual([{ kind: "plain", text: 'a <b c="d"> & e' }]);
    const unknown = tokenizeCode("anything", "brainfuck");
    expect(unknown).toEqual([{ kind: "plain", text: "anything" }]);
    expect(tokenizeCode("", "plaintext")).toEqual([]);
    expect(tokenizeCode("", "typescript")).toEqual([]);
  });

  it("never drops hostile markup characters: injection-shaped input round-trips", () => {
    const hostile = '<img src=x onerror="alert(1)">\n` ${process.env} ` \\n " \u0000';
    for (const language of ["typescript", "html", "markdown", "bash", "json", "plaintext"]) {
      expect(roundTrip(tokenizeCode(hostile, language)), language).toBe(hostile);
    }
  });

  it("handles CRLF line endings losslessly", () => {
    const crlf = "line one\r\nline two\r\n";
    expect(roundTrip(tokenizeCode(crlf, "typescript"))).toBe(crlf);
    expect(roundTrip(tokenizeCode(crlf, "markdown"))).toBe(crlf);
  });

  it("matches the frozen golden fixtures (cross-framework identity baseline)", () => {
    const fixturePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "golden-fixtures.json",
    );
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      cases: { language: string; code: string; expected: HighlightToken[] }[];
    };
    for (const testCase of fixture.cases) {
      expect(
        tokenizeCode(testCase.code, testCase.language),
        `golden stream for ${testCase.language}`,
      ).toEqual(testCase.expected);
    }
  });

  it("is total at the DOM boundary: omitted props coerce instead of throwing", () => {
    // Generated components lower required props straight into the call;
    // a consumer that omits one delivers undefined. The runtime coerces
    // (empty source → no tokens; missing language → plain run) rather
    // than throwing inside render, matching how template interpolation
    // tolerated omitted props before the transform existed.
    expect(tokenizeCode(undefined as unknown as string, "typescript")).toEqual([]);
    expect(
      tokenizeCode("const x = 1;", undefined as unknown as string),
    ).toEqual([{ kind: "plain", text: "const x = 1;" }]);
    expect(
      tokenizeCode(null as unknown as string, null as unknown as string),
    ).toEqual([]);
  });
});
