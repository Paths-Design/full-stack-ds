// @generated:start imports
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UsePageNavigatorOptions {
  index?: () => number | undefined;
  defaultIndex?: () => number | undefined;
  onIndexChange?: () => ((value: number) => void) | undefined;
}

export interface UsePageNavigatorResult {
  readonly page: number;
  setPage(next: number): void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function usePageNavigator(opts: UsePageNavigatorOptions = {}): UsePageNavigatorResult {
  const pageState = createControllableState<number>({
    controlled: opts.index,
    defaultValue: opts.defaultIndex?.() ?? 0,
    onChange: (v) => opts.onIndexChange?.()?.(v),
  });

  return {
    get page() { return pageState.value; },
    setPage(v) { pageState.set(v); },
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
