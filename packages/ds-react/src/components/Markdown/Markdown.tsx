// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown";
import { Fragment } from "react";
import "./Markdown.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface MarkdownProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "content" | "data-testid"> {
  content: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

function renderMarkdownBlocks(source: string): React.ReactNode[] {
  return parseMarkdown(source ?? "").map((block, blockIndex) =>
    renderMarkdownBlock(block, blockIndex),
  );
}

function renderMarkdownBlock(block: MarkdownBlock, key: React.Key): React.ReactNode {
  switch (block.kind) {
    case "heading":
      return (
        <h2 key={key} className="markdown__heading" data-block-kind="heading" data-level={block.level}>
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </h2>
      );
    case "paragraph":
      return (
        <p key={key} className="markdown__paragraph" data-block-kind="paragraph">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol key={key} className="markdown__orderedList" data-block-kind="orderedList">
          {block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}
        </ol>
      ) : (
        <ul key={key} className="markdown__unorderedList" data-block-kind="unorderedList">
          {block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}
        </ul>
      );
    case "listItem":
      return (
        <li key={key} className="markdown__listItem" data-block-kind="listItem">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </li>
      );
    case "codeBlock":
      return (
        <pre key={key} className="markdown__codeBlock" data-block-kind="codeBlock" data-language={block.language}>
          {block.text}
        </pre>
      );
    case "blockquote":
      return (
        <blockquote key={key} className="markdown__blockquote" data-block-kind="blockquote">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </blockquote>
      );
  }
}

function renderMarkdownMark(mark: MarkdownMark, key: React.Key): React.ReactNode {
  switch (mark.kind) {
    case "text":
      return <Fragment key={key}>{mark.text}</Fragment>;
    case "code":
      return (
        <code key={key} className="markdown__code" data-mark-kind="code">{mark.text}</code>
      );
    case "emphasis":
      return (
        <em key={key} className="markdown__emphasis" data-mark-kind="emphasis">
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </em>
      );
    case "strong":
      return (
        <strong key={key} className="markdown__strong" data-mark-kind="strong">
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </strong>
      );
    case "link":
      return mark.href === null ? (
        <Fragment key={key}>
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </Fragment>
      ) : (
        <a key={key} className="markdown__link" data-mark-kind="link" href={mark.href}>
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </a>
      );
  }
}

// @generated:end

// @generated:start component
export function Markdown({
  className,
  "data-testid": testId,
  content,
  ...rest
}: MarkdownProps) {
  const classNames = [
    "markdown",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="markdown" data-fsds-box="" {...rest}>
    {renderMarkdownBlocks(content)}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
