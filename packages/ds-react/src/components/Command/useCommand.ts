// @generated:start imports
import { type ReactNode, type RefObject } from "react";
import { useAnchorToggle, useControllableState, usePortal } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCommandOptions {
  /** Controlled "open" value. */
  open?: boolean;
  /** Initial uncontrolled "open" value. */
  defaultOpen?: boolean;
  /** Called when "open" changes. */
  onOpenChange?: (value: boolean) => void;
  /** Controlled "search" value. */
  search?: string;
  /** Initial uncontrolled "search" value. */
  defaultSearch?: string;
  /** Called when "search" changes. */
  onSearchChange?: (value: string) => void;
}

export interface UseCommandResult {
  open: boolean;
  setOpen: (next: boolean) => void;
  search: string;
  setSearch: (next: string) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  renderInPortal: (node: ReactNode) => ReactNode;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCommand(options: UseCommandOptions = {}): UseCommandResult {
  const [search, setSearch] = useControllableState<string>({
    controlled: options.search,
    defaultValue: options.defaultSearch ?? "",
    onChange: options.onSearchChange,
  });

  // anchor + panel refs come from useAnchorToggle below.
  const anchorToggle = useAnchorToggle({
    open: options.open,
    defaultOpen: options.defaultOpen ?? false,
    onOpenChange: options.onOpenChange,
  });

  const portal = usePortal({
    enabled: true,
  });

  return {
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    search,
    setSearch,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef as RefObject<HTMLDivElement | null>,
    renderInPortal: portal.render,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
