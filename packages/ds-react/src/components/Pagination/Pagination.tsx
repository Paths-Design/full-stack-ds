// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { usePagination } from "./usePagination";
import { usePagedSet } from "../../primitives/hooks/usePaging.js";
import "./Pagination.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PaginationPresentation = "indicators" | "pages";

export type PaginationProgress = "none" | "elapsed";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "defaultIndex" | "disabled" | "index" | "label" | "onIndexChange" | "pages" | "presentation" | "progress"> {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PaginationPresentation;
  label?: string;
  disabled?: boolean;
  progress?: PaginationProgress;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Pagination({
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  presentation = "indicators",
  progress = "none",
  disabled,
  className,
  "data-testid": testId,
  pages = [],
  label = "Choose page",
  ...rest
}: PaginationProps) {
  const { page, setPage } = usePagination({
    index: controlledIndex,
    defaultIndex,
    onIndexChange,
  });

  const pagedSet = usePagedSet({ index: page, items: pages,
    count: undefined, disabled: disabled, onIndexChange: setPage });
  const classNames = [
    "pagination",
    presentation && `pagination--${presentation}`,
    progress && `pagination--${progress}`,
    disabled && "pagination--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role="group" aria-label={label} data-testid={testId} data-fsds-component="pagination" data-fsds-box="" {...rest}>
    {(pages ?? []).map((item, index) => (
      <button className="pagination__item" type="button" onClick={() => pagedSet.request(index)} aria-label={item} aria-current={(index === page)} disabled={disabled} data-current={(index === page)} key={index}>
        <span className="pagination__marker" aria-hidden="true">
          <span className="pagination__fill" aria-hidden="true" />
        </span>
        <span className="pagination__label" aria-hidden="true">
          {item}
        </span>
      </button>
    ))}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
