// @generated:start imports
import { useControllableState } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseShuttleOptions {
  /** Controlled "selection" value. */
  value?: string[];
  /** Initial uncontrolled "selection" value. */
  defaultValue?: string[];
  /** Called when "selection" changes. */
  onValueChange?: (value: string[]) => void;
}

export interface UseShuttleResult {
  selection: string[];
  setSelection: (next: string[]) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useShuttle(options: UseShuttleOptions = {}): UseShuttleResult {
  const [selection, setSelection] = useControllableState<string[]>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? [],
    onChange: options.onValueChange,
  });

  return {
    selection,
    setSelection,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
