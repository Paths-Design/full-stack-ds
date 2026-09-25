import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CodeBlock, CodeBlockLine, CodeBlockToken } from "../CodeBlock";

describe("CodeBlock source presentation", () => {
  it("preserves canonical LF and CRLF source, including its trailing empty line", () => {
    const code = "const x = '<script>'\r\nnext\n";
    const { container } = render(<CodeBlock code={code} language="typescript" showLineNumbers />);
    const root = container.querySelector("pre")!;
    expect(root.querySelector("code")?.textContent).toBe(code);
    expect(root.querySelectorAll(".code-block__line")).toHaveLength(3);
    expect([...root.querySelectorAll(".code-block__gutter")].map((node) => node.getAttribute("data-line"))).toEqual(["1", "2", "3"]);
    expect(root.querySelectorAll("script")).toHaveLength(0);
    expect(root.querySelectorAll("[data-token]").length).toBeGreaterThan(0);
  });

  it("colors valid supplied tokens and renders invalid streams or disabled highlighting as plain source", () => {
    const code = "let x";
    const valid = [{ kind: "keyword" as const, text: "let" }, { kind: "plain" as const, text: " x" }];
    const { container, rerender } = render(<CodeBlock code={code} language="plaintext" tokens={valid} />);
    expect(container.querySelector('[data-token="keyword"]')?.textContent).toBe("let");
    rerender(<CodeBlock code={code} language="typescript" tokens={[{ kind: "keyword", text: "wrong" }]} />);
    expect(container.querySelector("code")?.textContent).toBe(code);
    expect(container.querySelectorAll("[data-token]")).toHaveLength(0);
    rerender(<CodeBlock code={code} language="typescript" tokens={valid} highlight={false} />);
    expect(container.querySelector("code")?.textContent).toBe(code);
    expect(container.querySelectorAll("[data-token]")).toHaveLength(0);
  });

  it("lets consumer content use the same line and token parts", () => {
    const { container } = render(<CodeBlock code="source" language="plaintext" showLineNumbers>
      <CodeBlockLine number={1}><CodeBlockToken kind="string">custom</CodeBlockToken></CodeBlockLine>
    </CodeBlock>);
    expect(container.querySelector("code")?.textContent).toBe("custom");
    expect(container.querySelectorAll(".code-block__line")).toHaveLength(1);
    expect(container.querySelector('[data-token="string"]')?.textContent).toBe("custom");
  });
});
