// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseRadioGroupOptions {
  value?: () => string | undefined;
  defaultValue?: string;
  onChange?: (value: string) => void;
  destroyRef: DestroyRef;
}

export interface UseRadioGroupResult {
  selection: Signal<string>;
  setSelection: (next: string) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useRadioGroup(options: UseRadioGroupOptions): UseRadioGroupResult {
  const { value: selection, set: setSelection } = createControllableState<string>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? "",
    onChange: options.onChange,
  });

  return {
    selection,
    setSelection,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
