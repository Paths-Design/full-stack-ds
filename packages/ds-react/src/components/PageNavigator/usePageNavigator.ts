// @generated:start imports
import { useControllableState } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UsePageNavigatorOptions {
  /** Controlled "page" value. */
  index?: number;
  /** Initial uncontrolled "page" value. */
  defaultIndex?: number;
  /** Called when "page" changes. */
  onIndexChange?: (value: number) => void;
}

export interface UsePageNavigatorResult {
  page: number;
  setPage: (next: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function usePageNavigator(options: UsePageNavigatorOptions = {}): UsePageNavigatorResult {
  const [page, setPage] = useControllableState<number>({
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
