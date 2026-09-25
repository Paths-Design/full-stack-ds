// @generated:start imports
import { type ReactNode } from "react";
import { Stack } from "../../primitives";
import { prepareHighlightSource } from "../../primitives/highlight/tokenize";
import "./CodeBlock.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeBlockToken = { kind: CodeBlockTokenType; text: string };

export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";

export type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CodeBlockProps {
  code: string;
  language: CodeBlockLanguage;
  highlight?: boolean;
  tokens?: CodeBlockToken[];
  showLineNumbers?: boolean;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents


export interface CodeBlockLineProps { number: number; children?: ReactNode; ending?: string; className?: string }
export function CodeBlockLine({ number, children, ending = "", className }: CodeBlockLineProps) {
  return <span className={["code-block__line", className].filter(Boolean).join(" ")}><span className="code-block__gutter" data-line={number} aria-hidden="true" />{children}{ending}</span>;
}

export interface CodeBlockTokenProps { kind: CodeBlockTokenType; children?: ReactNode; className?: string }
export function CodeBlockToken({ kind, children, className }: CodeBlockTokenProps) {
  return <span className={["code-block__token", className].filter(Boolean).join(" ")} data-token={kind}>{children}</span>;
}
// @generated:end

// @generated:start component
export function CodeBlock({
  className,
  "data-testid": testId,
  children,
  code,
  language,
  highlight = true,
  tokens,
  showLineNumbers = false,
  ...rest
}: CodeBlockProps) {
  const classNames = [
    "code-block",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="pre" className={`${classNames}`} data-language={language} data-line-numbers={showLineNumbers} data-testid={testId} data-fsds-component="code-block" data-fsds-box="" {...rest}>
    <code className="code-block__code" spellCheck="false" data-language={language}>
      {children}
      {!children ? (
        <span className="code-block__source">
          {prepareHighlightSource(code, language, { tokens: tokens, highlight: highlight }).lines.map((line) => (<CodeBlockLine key={line.number} number={line.number} ending={line.ending}>{line.tokens.map((token, tokenIndex) => line.highlighted ? (<CodeBlockToken key={tokenIndex} kind={token.kind}>{token.text}</CodeBlockToken>) : token.text)}</CodeBlockLine>))}
        </span>
      ) : null}
    </code>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
