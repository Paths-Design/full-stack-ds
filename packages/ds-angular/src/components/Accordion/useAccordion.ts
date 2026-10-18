// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createCompoundContext, createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseAccordionOptions {
  value?: () => string | string[] | undefined;
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  destroyRef: DestroyRef;
}

export interface UseAccordionResult {
  openness: Signal<string | string[]>;
  setOpenness: (next: string | string[]) => void;
}

export interface AccordionContextValue {
  readonly openness: Signal<string | string[]>;
  toggleItem: (value: string) => void;
  isItemOpen: (value: string) => boolean;
  type: Signal<"single" | "multiple">;
  collapsible: Signal<boolean>;
  disabled: Signal<boolean>;
  idBase: string;
}

const { token: AccordionContextToken, useContext: useAccordionContext } =
  createCompoundContext<AccordionContextValue>("Accordion");

export { AccordionContextToken, useAccordionContext };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useAccordion(options: UseAccordionOptions): UseAccordionResult {
  const { value: openness, set: setOpenness } = createControllableState<string | string[]>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? undefined as never,
    onChange: options.onValueChange,
  });

  return {
    openness,
    setOpenness,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
