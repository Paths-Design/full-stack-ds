// @generated:start imports
import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useCallback } from "react";
import { useAnchorToggle, useControllableState } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseSelectOptions {
  /** Controlled "selection" value. */
  value?: string | string[];
  /** Initial uncontrolled "selection" value. */
  defaultValue?: string | string[];
  /** Called when "selection" changes. */
  onChange?: (value: string | string[]) => void;
  /** Controlled "open" value. */
  open?: boolean;
  /** Initial uncontrolled "open" value. */
  defaultOpen?: boolean;
  /** Called when "open" changes. */
  onOpenChange?: (value: boolean) => void;
  /** Mode gate the keyboard select behavior reads. */
  multiple?: boolean;
}

export interface UseSelectResult {
  selection: string | string[];
  setSelection: (next: string | string[]) => void;
  open: boolean;
  setOpen: (next: boolean) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  handleTriggerKeydown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  handleContentKeydown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  handleOptionKeydown: (event: ReactKeyboardEvent<HTMLElement>, value: string) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useSelect(options: UseSelectOptions = {}): UseSelectResult {
  const [selection, setSelection] = useControllableState<string | string[]>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? "beta",
    onChange: (value) => { options.onChange?.(value); if (!options.multiple) { anchorToggle.setOpen(false); requestAnimationFrame(() => { anchorToggle.anchorRef.current?.focus(); }); } },
  });

  // anchor + panel refs come from useAnchorToggle below.
  const anchorToggle = useAnchorToggle({
    open: options.open,
    defaultOpen: options.defaultOpen ?? false,
    onOpenChange: options.onOpenChange,
  });

  const handleTriggerKeydown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!(event.key === "ArrowDown")) return;
      event.preventDefault();
      anchorToggle.setOpen(true);
      requestAnimationFrame(() => {
        if (!anchorToggle.panelRef.current) return;
        (anchorToggle.panelRef.current.querySelector<HTMLElement>("input") ?? anchorToggle.panelRef.current.querySelector<HTMLElement>("[role=\"option\"]:not(:disabled)"))?.focus();
      });
    },
    [anchorToggle],
  );

  const handleContentKeydown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>("[role=\"option\"]:not(:disabled)"),
      );
      const currentIndex = items.findIndex((item) => item === document.activeElement);
      if (event.key === "ArrowUp") {
        event.preventDefault();
        items[currentIndex <= 0 ? items.length - 1 : currentIndex - 1]?.focus();
      }
      else if (event.key === "ArrowDown") {
        event.preventDefault();
        items[currentIndex === -1 || currentIndex >= items.length - 1 ? 0 : currentIndex + 1]?.focus();
      }
      else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      }
      else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    },
    [],
  );

  const handleOptionKeydown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, value: string) => {
      if (!(event.key === "Enter" || event.key === "Space")) return;
      event.preventDefault();
      const current = Array.isArray(selection) ? selection : selection == null ? [] : [selection];
      setSelection(options.multiple ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);
    },
    [selection, setSelection, options.multiple],
  );

  return {
    selection,
    setSelection,
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef as RefObject<HTMLDivElement | null>,
    handleTriggerKeydown,
    handleContentKeydown,
    handleOptionKeydown,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
