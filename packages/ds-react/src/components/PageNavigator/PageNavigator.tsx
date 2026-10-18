// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { Input } from "../Input/Input";
import { Pagination } from "../Pagination/Pagination";
import { usePageNavigator } from "./usePageNavigator";
import { usePagedSet } from "../../primitives/hooks/usePaging.js";
import { useFsdsMessages, formatFsdsMessage } from "../../primitives/messages";
import "./PageNavigator.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PageNavigatorPresentation = "indicators" | "pages";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface PageNavigatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "commitLabel" | "data-testid" | "defaultIndex" | "disabled" | "index" | "label" | "nextLabel" | "onIndexChange" | "pageCount" | "pageLabel" | "pages" | "presentation" | "previousLabel" | "showChoices"> {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PageNavigatorPresentation;
  label?: string;
  disabled?: boolean;
  pageCount?: number;
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  commitLabel?: string;
  showChoices?: boolean;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
const PageNavigatorMessages = { groupLabel: "Page navigation", pageLabel: "Current page", previousPage: "Previous page", nextPage: "Next page", commit: "Go", pageCount: "of {count}" };

export function PageNavigator({
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  disabled,
  className,
  "data-testid": testId,
  pages = [],
  presentation = "indicators",
  label: labelProp,
  pageCount,
  pageLabel: pageLabelProp,
  previousLabel: previousLabelProp,
  nextLabel: nextLabelProp,
  commitLabel: commitLabelProp,
  showChoices = false,
  ...rest
}: PageNavigatorProps) {
  const fsdsMessages = useFsdsMessages("PageNavigator", PageNavigatorMessages);
  const label = labelProp ?? fsdsMessages.groupLabel;
  const pageLabel = pageLabelProp ?? fsdsMessages.pageLabel;
  const previousLabel = previousLabelProp ?? fsdsMessages.previousPage;
  const nextLabel = nextLabelProp ?? fsdsMessages.nextPage;
  const commitLabel = commitLabelProp ?? fsdsMessages.commit;
  const { page, setPage } = usePageNavigator({
    index: controlledIndex,
    defaultIndex,
    onIndexChange,
  });

  const pagedSet = usePagedSet({ index: page, items: pages,
    count: pageCount, disabled: disabled, onIndexChange: setPage });
  const classNames = [
    "page-navigator",
    disabled && "page-navigator--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role="group" aria-label={label} data-testid={testId} data-fsds-component="page-navigator" data-fsds-box="" {...rest}>
    <Button className="page-navigator__previous" type="button" onClick={pagedSet.previous} disabled={pagedSet.state.previousDisabled} ariaLabel={previousLabel}>
      <Icon className="page-navigator__previousIcon" name="arrow-left" size="sm" />
    </Button>
    <div className="page-navigator__field" onKeyDown={pagedSet.commitOnEnter} onBlur={pagedSet.commit}>
      <Input className="page-navigator__input" type="number" onChange={pagedSet.edit} value={pagedSet.state.draft} disabled={pagedSet.state.disabled} ariaLabel={pageLabel} />
    </div>
    <span className="page-navigator__context">
      {formatFsdsMessage(fsdsMessages.pageCount, { count: pagedSet.state.count })}
    </span>
    <Button className="page-navigator__commit" type="button" onClick={pagedSet.commit} disabled={pagedSet.state.disabled} ariaLabel={commitLabel}>
      <span>
        {commitLabel}
      </span>
    </Button>
    <Button className="page-navigator__next" type="button" onClick={pagedSet.next} disabled={pagedSet.state.nextDisabled} ariaLabel={nextLabel}>
      <Icon className="page-navigator__nextIcon" name="arrow-right" size="sm" />
    </Button>
    {showChoices ? (
      <Pagination className="page-navigator__choices" onIndexChange={pagedSet.request} pages={pages} index={page} presentation={presentation} label={label} disabled={pagedSet.state.disabled} />
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
