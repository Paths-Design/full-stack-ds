import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { ComponentProps } from "react";
import { CodeBlock, CodeBlockLine, CodeBlockToken } from "../CodeBlock";
import { FsdsThemeProvider } from "../../../tokens";

function mount(props: ComponentProps<typeof CodeBlock>, themeTokens: Record<string, string> = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<FsdsThemeProvider value={{ tokens: themeTokens }}><CodeBlock {...props} testID="subject" /></FsdsThemeProvider>);
  });
  return renderer!;
}

describe("CodeBlock native source presentation", () => {
  it("keeps the canonical source accessible while line numbers remain presentational", () => {
    const code = "first\r\nsecond\n";
    const tree = mount({ code, language: "plaintext", showLineNumbers: true });
    expect(tree.root.findAllByProps({ testID: "subject" }).at(-1)?.props.accessibilityLabel).toBe(code);
    expect(tree.root.findAllByType(CodeBlockLine)).toHaveLength(3);
    expect(tree.root.findAllByType(CodeBlockToken)).toHaveLength(0);
  });

  it("uses supplied kinds and component token overrides, then falls back on invalid tokens", () => {
    const code = "let x";
    const tokens = [{ kind: "keyword" as const, text: "let" }, { kind: "plain" as const, text: " x" }];
    const tree = mount({ code, language: "typescript", tokens }, { "code-block.token.color.keyword": "#123456" });
    const rendered = tree.root.findAllByType(CodeBlockToken);
    expect(rendered).toHaveLength(2);
    const keywordText = rendered[0].findByType("Text" as never);
    expect(keywordText.props.style.color).toBe("#123456");
    const invalid = mount({ code, language: "typescript", tokens: [{ kind: "keyword", text: "wrong" }] });
    expect(invalid.root.findAllByType(CodeBlockToken)).toHaveLength(0);
    const disabled = mount({ code, language: "typescript", tokens, highlight: false });
    expect(disabled.root.findAllByType(CodeBlockToken)).toHaveLength(0);
  });
});
