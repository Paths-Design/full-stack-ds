// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useShowMore } from "./useShowMore";
import { useFsdsMessages } from "../../primitives/messages";
import "./ShowMore.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ShowMoreProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "defaultExpanded" | "expanded" | "maxLines" | "onExpandedChange" | "showLessLabel" | "showMoreLabel"> {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxLines?: number;
  showMoreLabel?: string;
  showLessLabel?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface ShowMoreContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function ShowMoreContent({
  children,
  className,
  "data-testid": testId,
}: ShowMoreContentProps) {
  const classNames = ["show-more__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface ShowMoreTriggerProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function ShowMoreTrigger({
  children,
  className,
  "data-testid": testId,
}: ShowMoreTriggerProps) {
  const classNames = ["show-more__trigger", className].filter(Boolean).join(" ");
  return (
    <Stack as="button" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const ShowMoreMessages = { showMore: "Show more", showLess: "Show less" };

export function ShowMore({
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  className,
  "data-testid": testId,
  children,
  maxLines = 3,
  showMoreLabel: showMoreLabelProp,
  showLessLabel: showLessLabelProp,
  ...rest
}: ShowMoreProps) {
  const fsdsMessages = useFsdsMessages("ShowMore", ShowMoreMessages);
  const showMoreLabel = showMoreLabelProp ?? fsdsMessages.showMore;
  const showLessLabel = showLessLabelProp ?? fsdsMessages.showLess;
  const { expanded, setExpanded } = useShowMore({
    expanded: controlledExpanded,
    defaultExpanded,
    onExpandedChange,
  });

  const classNames = [
    "show-more",
    expanded && "show-more--expanded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="show-more" data-fsds-box="" {...rest}>
    <div className="show-more__content" style={{ "--fsds-show-more-content-max-lines": maxLines } as CSSProperties}>
      {children}
    </div>
    <button className="show-more__trigger" type="button" onClick={(e) => { if (canActivateInteraction(e, false)) setExpanded(!expanded); }} aria-expanded={expanded}>
      {(expanded ? showLessLabel : showMoreLabel)}
    </button>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
