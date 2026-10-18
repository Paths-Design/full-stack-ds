// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createAnchorToggle, createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCommandOptions {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  search?: () => string | undefined;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  destroyRef: DestroyRef;
}

export interface UseCommandResult {
  open: Signal<boolean>;
  setOpen: (next: boolean) => void;
  search: Signal<string>;
  setSearch: (next: string) => void;
  panelRef: { nativeElement: HTMLElement | null };
  anchorRef: { nativeElement: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCommand(options: UseCommandOptions): UseCommandResult {
  const { value: search, set: setSearch } = createControllableState<string>({
    controlled: options.search,
    defaultValue: options.defaultSearch ?? "",
    onChange: options.onSearchChange,
  });

  const anchorToggle = createAnchorToggle({
    open: options.open,
    defaultOpen: options.defaultOpen ?? false,
    onOpenChange: options.onOpenChange,
    destroyRef: options.destroyRef,
  });

  return {
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    search,
    setSearch,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
