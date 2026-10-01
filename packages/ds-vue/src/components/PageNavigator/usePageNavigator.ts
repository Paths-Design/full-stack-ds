// @generated:start imports
import { type Ref } from "vue";
import { useControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UsePageNavigatorOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onIndexChange?: (value: number) => void;
}

export interface UsePageNavigatorResult {
  page: Ref<number>;
  setPage: (next: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function usePageNavigator(options: UsePageNavigatorOptions = {}): UsePageNavigatorResult {
  const { value: page, set: setPage } = useControllableState<number>({
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
