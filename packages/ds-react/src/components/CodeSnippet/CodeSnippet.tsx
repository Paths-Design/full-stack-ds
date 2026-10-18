// @generated:start imports
import { Stack } from "../../primitives";
import "./CodeSnippet.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeSnippetElement = "code" | "kbd" | "samp";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CodeSnippetProps {
  text: string;
  as?: CodeSnippetElement;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function CodeSnippet({
  as = "code",
  className,
  "data-testid": testId,
  text,
  ...rest
}: CodeSnippetProps) {
  const classNames = [
    "code-snippet",
    as && `code-snippet--${as}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const As = as ?? "code";

  return (
  <Stack layout="native" as={As} className={`${classNames}`} spellCheck="false" data-testid={testId} data-fsds-component="code-snippet" data-fsds-box="" {...rest}>
    {text}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
