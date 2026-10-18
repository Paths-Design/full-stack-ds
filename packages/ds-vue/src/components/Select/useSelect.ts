// @generated:start imports
import { type Ref } from "vue";
import { useAnchorToggle, useControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseSelectOptions {
  value?: () => string | string[] | undefined;
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  /** Mode gate the keyboard select behavior reads. */
  multiple?: () => boolean | undefined;
}

export interface UseSelectResult {
  selection: Ref<string | string[]>;
  setSelection: (next: string | string[]) => void;
  open: Ref<boolean>;
  setOpen: (next: boolean) => void;
  panelRef: Ref<HTMLElement | null>;
  anchorRef: Ref<HTMLElement | null>;
  handleTriggerKeydown: (event: KeyboardEvent) => void;
  handleContentKeydown: (event: KeyboardEvent) => void;
  handleOptionKeydown: (event: KeyboardEvent, value: string) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useSelect(options: UseSelectOptions = {}): UseSelectResult {
  const { value: selection, set: setSelection } = useControllableState<string | string[]>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? undefined as never,
    onChange: (value) => { options.onChange?.(value); if (!options.multiple?.()) { anchorToggle.setOpen(false); requestAnimationFrame(() => { anchorToggle.anchorRef.value?.focus(); }); } },
  });

  const anchorToggle = useAnchorToggle({
    open: options.open,
    defaultOpen: options.defaultOpen ?? false,
    onOpenChange: options.onOpenChange,
  });

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (!(event.key === "ArrowDown")) return;
    event.preventDefault();
    anchorToggle.setOpen(true);
    requestAnimationFrame(() => {
      if (!anchorToggle.panelRef.value) return;
      (anchorToggle.panelRef.value.querySelector<HTMLElement>("input") ?? anchorToggle.panelRef.value.querySelector<HTMLElement>("[role=\"option\"]:not(:disabled)"))?.focus();
    });
  }

  function handleContentKeydown(event: KeyboardEvent): void {
    const items = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[role=\"option\"]:not(:disabled)"),
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
  }

  function handleOptionKeydown(event: KeyboardEvent, value: string): void {
    if (!(event.key === "Enter" || event.key === "Space")) return;
    event.preventDefault();
    const current = Array.isArray(selection.value) ? selection.value : selection.value == null ? [] : [selection.value];
    setSelection(options.multiple?.() ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);
  }

  return {
    selection,
    setSelection,
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef,
    handleTriggerKeydown,
    handleContentKeydown,
    handleOptionKeydown,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
