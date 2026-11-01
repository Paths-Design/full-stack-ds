// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createTabsStyles } from "./Tabs.styles";
import { createCompoundContext } from "../../primitives/hooks";
// @generated:end

// @generated:start types
export type TabsOrientation = "horizontal" | "vertical";
export type TabsAppearance = "underline" | "pills";
export type TabsActivationMode = "automatic" | "manual";
// @generated:end

// @generated:start props
export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  appearance?: TabsAppearance;
  activationMode?: TabsActivationMode;
  loop?: boolean;
  unmountInactive?: boolean;
  idBase?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  registeredTabs: string[];
  idBase: string;
  orientation: TabsOrientation;
  activationMode: TabsActivationMode;
  loop: boolean;
  unmountInactive: boolean;
}

const [TabsContextProvider, useTabsContext] = createCompoundContext<TabsContextValue>("Tabs");
export { useTabsContext };

export function Tabs({
  value: controlledActiveTab,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  activationMode = "automatic",
  loop = true,
  unmountInactive = true,
  idBase,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: TabsProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTabsStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<string>((defaultValue ?? "") as string);
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;
  const setActiveTab = useCallback((next: string) => {
    if (controlledActiveTab === undefined) setUncontrolledActiveTab(next);
    onValueChange?.(next);
  }, [controlledActiveTab, onValueChange]);
  const [registeredTabs, setRegisteredTabs] = useState<string[]>([]);
  const registerTab = useCallback((value: string) => {
    setRegisteredTabs((tabs) => (tabs.includes(value) ? tabs : [...tabs, value]));
  }, []);
  const unregisterTab = useCallback((value: string) => {
    setRegisteredTabs((tabs) => tabs.filter((tab) => tab !== value));
  }, []);
  const generatedIdBase = useId().replace(/:/g, "");
  const resolvedIdBase = idBase ?? generatedIdBase;

  return (
    <TabsContextProvider
      value={{
        activeTab,
        setActiveTab,
        registeredTabs,
        registerTab,
        unregisterTab,
        idBase: resolvedIdBase,
        orientation,
        activationMode,
        loop,
        unmountInactive,
      }}
    >
      <View
        testID={testID}
        style={[styles.root, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={accessibilityLabelledBy}
      >
        {renderTextChildren(children)}
      </View>
    </TabsContextProvider>
  );
}

export interface TabsListProps {
  children?: ReactNode;
  testID?: string;
}

export function TabsList({ children, testID }: TabsListProps) {
  useTabsContext();
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTabsStyles(fsdsTheme), [fsdsTheme]);

  return (
    <View testID={testID} style={styles.list}>
      {children}
      <View style={styles.indicator} accessible={false} />
    </View>
  );
}

export interface TabsTabProps {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  testID?: string;
}

export function TabsTab({ value, disabled, children, testID }: TabsTabProps) {
  const ctx = useTabsContext();
  const isActive = ctx.activeTab === value;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTabsStyles(fsdsTheme), [fsdsTheme]);
  const { registerTab, unregisterTab } = ctx;
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    registerTab(valueRef.current);
    return () => unregisterTab(valueRef.current);
  }, [registerTab, unregisterTab]);

  return (
    <Pressable
      testID={testID}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive, disabled: disabled === true }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        ctx.setActiveTab(value);
      }}
    >
      {renderTextChildren(children)}
    </Pressable>
  );
}

export interface TabsPanelProps {
  value: string;
  children?: ReactNode;
  testID?: string;
}

export function TabsPanel({ value, children, testID }: TabsPanelProps) {
  const ctx = useTabsContext();
  const isActive = ctx.activeTab === value;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTabsStyles(fsdsTheme), [fsdsTheme]);

  if (ctx.unmountInactive && !isActive) return null;

  return (
    <View
      testID={testID}
      style={[styles.panel, isActive ? undefined : { display: "none" }]}
      accessible={isActive}
    >
      {renderTextChildren(children)}
    </View>
  );
}
// @generated:end
