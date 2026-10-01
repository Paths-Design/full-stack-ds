// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { Input } from "../Input/Input";
import { Pagination } from "../Pagination/Pagination";
import { usePageNavigator } from "./usePageNavigator";
import { usePagedSet } from "../../primitives/hooks/usePaging.js";
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
export interface PageNavigatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "commitLabel" | "data-testid" | "defaultIndex" | "disabled" | "index" | "label" | "nextLabel" | "ofLabel" | "onIndexChange" | "pageCount" | "pageLabel" | "pages" | "presentation" | "previousLabel" | "showChoices"> {
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
  ofLabel?: string;
  commitLabel?: string;
  showChoices?: boolean;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function PageNavigator({
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  disabled,
  className,
  "data-testid": testId,
  pages = [],
  presentation = "indicators",
  label = "Page navigation",
  pageCount,
  pageLabel = "Current page",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  ofLabel = "of",
  commitLabel = "Go",
  showChoices = false,
  ...rest
}: PageNavigatorProps) {
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
      {ofLabel}
    </span>
    <span className="page-navigator__total">
      {pagedSet.state.count}
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
