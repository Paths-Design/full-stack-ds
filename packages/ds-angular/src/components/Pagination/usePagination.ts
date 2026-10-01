// @generated:start imports
import { DestroyRef, type Signal } from "@angular/core";
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UsePaginationOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onIndexChange?: (value: number) => void;
  destroyRef: DestroyRef;
}

export interface UsePaginationResult {
  page: Signal<number>;
  setPage: (next: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { value: page, set: setPage } = createControllableState<number>({
    controlled: options.index,
    defaultValue: options.defaultIndex ?? 0,
    onChange: options.onIndexChange,
  });

  return {
    page,
    setPage,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
