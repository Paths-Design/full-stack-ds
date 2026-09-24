// @generated:start imports
import { type ReactNode } from "react";
import { Stack } from "../../primitives";
import { tokenizeCode } from "../../primitives/highlight/tokenize";
import "./CodeBlock.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
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
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function CodeBlock({
  className,
  "data-testid": testId,
  children,
  code,
  language,
  highlight = true,
  ...rest
}: CodeBlockProps) {
  const classNames = [
    "code-block",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="pre" className={`${classNames}`} data-language={language} data-testid={testId} data-fsds-component="code-block" data-fsds-box="" {...rest}>
    <code className="code-block__code" spellCheck="false" data-language={language}>
      {children}
      {!children ? (
        <span className="code-block__source">
          {highlight ? (tokenizeCode(code, language).map((token, tokenIndex) => (<span key={tokenIndex} className="code-block__token" data-token={token.kind}>{token.text}</span>))) : (code)}
        </span>
      ) : null}
    </code>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
