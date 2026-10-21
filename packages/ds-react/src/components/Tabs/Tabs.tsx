// @generated:start imports
import { InteractionHost, type InteractionHostProps } from "../../primitives/InteractionHost";
import { type HTMLAttributes, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef } from "react";
import { useTabs } from "./useTabs";
import { createCompoundContext } from "../../primitives/hooks";
import { isRtl } from "../../primitives/direction/direction";
import "./Tabs.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type TabsOrientation = "horizontal" | "vertical";

export type TabsAppearance = "underline" | "pills";

export type TabsActivationMode = "automatic" | "manual";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "activationMode" | "appearance" | "children" | "className" | "data-testid" | "defaultValue" | "idBase" | "loop" | "onValueChange" | "orientation" | "unmountInactive" | "value"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  appearance?: TabsAppearance;
  activationMode?: TabsActivationMode;
  loop?: boolean;
  unmountInactive?: boolean;
  idBase?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  registeredTabs: string[];
  idBase: string;
  orientation: "horizontal" | "vertical";
  activationMode: "automatic" | "manual";
  loop: boolean;
  unmountInactive: boolean;
}

const [TabsContextProvider, useTabsContext] = createCompoundContext<TabsContextValue>("Tabs");
export { useTabsContext };

export interface TabsListProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TabsList({
  children,
  className,
  "data-testid": testId,
}: TabsListProps) {
  const ctx = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);
  const classNames = ["tabs__list", className].filter(Boolean).join(" ");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tabs = ctx.registeredTabs;
      if (tabs.length === 0) return;
      const currentIndex = tabs.indexOf(ctx.activeTab);
      const isHorizontal = ctx.orientation !== "vertical";
      const rtl = isRtl(e.currentTarget);
      const towardEnd = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
      const towardStart = rtl ? e.key === "ArrowRight" : e.key === "ArrowLeft";
      let nextIndex = currentIndex;
      if (
        (isHorizontal && towardEnd) ||
        (!isHorizontal && e.key === "ArrowDown")
      ) {
        e.preventDefault();
        nextIndex = ctx.loop
          ? (currentIndex + 1) % tabs.length
          : Math.min(currentIndex + 1, tabs.length - 1);
      } else if (
        (isHorizontal && towardStart) ||
        (!isHorizontal && e.key === "ArrowUp")
      ) {
        e.preventDefault();
        nextIndex = ctx.loop
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : Math.max(currentIndex - 1, 0);
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      } else if (e.key === "Enter" || e.key === " ") {
        if (ctx.activationMode === "manual") {
          e.preventDefault();
          const focusedBtn = listRef.current?.querySelector<HTMLButtonElement>("[role=\"tab\"]:focus");
          if (focusedBtn) {
            const val = focusedBtn.getAttribute("data-value");
            if (val) ctx.setActiveTab(val);
          }
        }
        return;
      } else {
        return;
      }
      const targetValue = tabs[nextIndex];
      if (ctx.activationMode === "automatic") {
        ctx.setActiveTab(targetValue);
      }
      // Move focus to the target tab button
      const btn = listRef.current?.querySelector<HTMLButtonElement>(
        `[role="tab"][data-value="${targetValue}"]`,
      );
      btn?.focus();
    },
    [ctx],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      tabIndex={-1}
      className={classNames}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      aria-orientation={ctx.orientation}
    >
      {children}
      <span className="tabs__indicator" aria-hidden="true" />
    </div>
  );
}

export interface TabsTabProps extends Omit<InteractionHostProps, "value"> {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TabsTab({
  value,
  disabled,
  children,
  asChild,
  className,
  "data-testid": testId,
  ...hostProps
}: TabsTabProps) {
  const ctx = useTabsContext();
  const isActive = ctx.activeTab === value;
  const classNames = [
    "tabs__tab",
    isActive && "tabs__tab--active",
    className,
  ].filter(Boolean).join(" ");

  // Self-register on mount, unregister on unmount
  const { registerTab, unregisterTab } = ctx;
  // Use a ref so the cleanup closure always references the current value
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    registerTab(valueRef.current);
    return () => unregisterTab(valueRef.current);
  }, [registerTab, unregisterTab]);

  return (
    <InteractionHost {...hostProps} asChild={asChild}
      role="tab"
      type="button"
      className={classNames}
      data-value={value}
      data-testid={testId}
      id={`${ctx.idBase}-tab-${value}`}
      aria-controls={`${ctx.idBase}-panel-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onActivate={() => ctx.setActiveTab(value)}
    >
      {children}
    </InteractionHost>
  );
}

export interface TabsPanelProps {
  value: string;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TabsPanel({
  value,
  children,
  className,
  "data-testid": testId,
}: TabsPanelProps) {
  const ctx = useTabsContext();
  const isActive = ctx.activeTab === value;
  const classNames = ["tabs__panel", className].filter(Boolean).join(" ");

  if (ctx.unmountInactive && !isActive) return null;

  return (
    <div
      role="tabpanel"
      className={classNames}
      id={`${ctx.idBase}-panel-${value}`}
      aria-labelledby={`${ctx.idBase}-tab-${value}`}
      tabIndex={0}
      data-testid={testId}
      hidden={!isActive ? true : undefined}
    >
      {children}
    </div>
  );
}
// @generated:end

// @generated:start component
export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  appearance = "underline",
  activationMode = "automatic",
  loop = true,
  unmountInactive,
  idBase,
  className,
  "data-testid": testId,
  children,
  ...rest
}: TabsProps) {
  const { activeTab, setActiveTab, registeredTabs, registerTab, unregisterTab, idBase: resolvedIdBase } = useTabs({
    value: controlledValue,
    defaultValue,
    onValueChange,
    idBase,
  });

  const classNames = [
    "tabs",
    orientation && `tabs--${orientation}`,
    appearance && `tabs--${appearance}`,
    activationMode && `tabs--${activationMode}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TabsContextProvider
      value={{
        activeTab,
        setActiveTab,
        registeredTabs,
        registerTab,
        unregisterTab,
        idBase: resolvedIdBase,
        orientation: orientation ?? "horizontal",
        activationMode: activationMode ?? "automatic",
        loop: loop ?? true,
        unmountInactive: unmountInactive ?? true,
      }}
    >
      <div
        className={classNames}
        data-testid={testId}
        data-fsds-component="tabs" data-fsds-box=""
        {...rest}
      >
        {children}
      </div>
    </TabsContextProvider>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
