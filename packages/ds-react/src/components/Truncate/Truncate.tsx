// @generated:start imports
import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useTruncate } from "./useTruncate";
import { useFsdsMessages } from "../../primitives/messages";
import "./Truncate.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface TruncateProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "collapseText" | "data-testid" | "defaultExpanded" | "expandText" | "expandable" | "expanded" | "lines" | "onExpandedChange"> {
  lines?: number;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandText?: string;
  collapseText?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface TruncateContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TruncateContent({
  children,
  className,
  "data-testid": testId,
}: TruncateContentProps) {
  const classNames = ["truncate__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const TruncateMessages = { expand: "Show more", collapse: "Show less" };

export function Truncate({
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  className,
  "data-testid": testId,
  children,
  lines,
  expandable,
  expandText: expandTextProp,
  collapseText: collapseTextProp,
  ...rest
}: TruncateProps) {
  const fsdsMessages = useFsdsMessages("Truncate", TruncateMessages);
  const expandText = expandTextProp ?? fsdsMessages.expand;
  const collapseText = collapseTextProp ?? fsdsMessages.collapse;
  const { expanded, setExpanded } = useTruncate({
    expanded: controlledExpanded,
    defaultExpanded,
    onExpandedChange,
  });

  const classNames = [
    "truncate",
    expanded && "truncate--expanded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="truncate" data-fsds-box="" {...rest}>
    <span className="truncate__content" style={{ "--fsds-truncate-content-lines": lines } as CSSProperties}>
      {children}
    </span>
    {expandable ? (
      <button className="truncate__toggle" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {(expanded ? collapseText : expandText)}
      </button>
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
