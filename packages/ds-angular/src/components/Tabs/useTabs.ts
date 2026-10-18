// @generated:start imports
import { signal, type DestroyRef, type Signal, type WritableSignal } from "@angular/core";
import { createCompoundContext, createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseTabsOptions {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Base string for generating tab and panel IDs. Defaults to a generated id. */
  idBase?: string;
  destroyRef: DestroyRef;
}

export interface UseTabsResult {
  activeTab: Signal<string>;
  setActiveTab: (next: string) => void;
  /** DOM-order list of registered tab values. */
  registeredTabs: WritableSignal<string[]>;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  /** Base string for generating tab and panel IDs. */
  idBase: string;
}

export interface TabsContextValue {
  readonly activeTab: WritableSignal<string>;
  setActiveTab: (value: string) => void;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  registeredTabs: WritableSignal<string[]>;
  idBase: string;
  // Config signals — reactive so child components re-render on prop changes
  orientation: WritableSignal<"horizontal" | "vertical">;
  activationMode: WritableSignal<"automatic" | "manual">;
  loop: WritableSignal<boolean>;
  unmountInactive: WritableSignal<boolean>;
}

const { token: TabsContextToken, useContext: useTabsContext } =
  createCompoundContext<TabsContextValue>("Tabs");

export { TabsContextToken, useTabsContext };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
let _tabsIdCounter = 0;

export function useTabs(options: UseTabsOptions): UseTabsResult {
  const { value: activeTab, set: setActiveTab } = createControllableState<string>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? "",
    onChange: options.onValueChange,
  });

  const registeredTabs = signal<string[]>([]);

  const resolvedIdBase = options.idBase ?? `tabs-${++_tabsIdCounter}`;

  function registerTab(value: string): void {
    if (!registeredTabs().includes(value)) {
      registeredTabs.set([...registeredTabs(), value]);
    }
  }

  function unregisterTab(value: string): void {
    registeredTabs.set(registeredTabs().filter((v) => v !== value));
  }

  return {
    activeTab,
    setActiveTab,
    registeredTabs,
    registerTab,
    unregisterTab,
    idBase: resolvedIdBase,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
