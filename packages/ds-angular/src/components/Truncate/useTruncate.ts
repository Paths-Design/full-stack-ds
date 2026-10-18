// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseTruncateOptions {
  expanded?: () => boolean | undefined;
  defaultExpanded?: boolean;
  onExpandedChange?: (value: boolean) => void;
  destroyRef: DestroyRef;
}

export interface UseTruncateResult {
  expanded: Signal<boolean>;
  setExpanded: (next: boolean) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useTruncate(options: UseTruncateOptions): UseTruncateResult {
  const { value: expanded, set: setExpanded } = createControllableState<boolean>({
    controlled: options.expanded,
    defaultValue: options.defaultExpanded ?? false,
    onChange: options.onExpandedChange,
  });

  return {
    expanded,
    setExpanded,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
