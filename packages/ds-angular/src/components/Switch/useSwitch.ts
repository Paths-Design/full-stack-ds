// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseSwitchOptions {
  checked?: () => boolean | undefined;
  defaultChecked?: boolean;
  onChange?: (value: boolean) => void;
  destroyRef: DestroyRef;
}

export interface UseSwitchResult {
  checked: Signal<boolean>;
  setChecked: (next: boolean) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useSwitch(options: UseSwitchOptions): UseSwitchResult {
  const { value: checked, set: setChecked } = createControllableState<boolean>({
    controlled: options.checked,
    defaultValue: options.defaultChecked ?? false,
    onChange: options.onChange,
  });

  return {
    checked,
    setChecked,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
