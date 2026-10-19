// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createAccordionStyles } from "./Accordion.styles";
import { Icon } from "../Icon/Icon";
// @generated:end

// @generated:start types
export type AccordionType = "single" | "multiple";
// @generated:end

// @generated:start props
export interface AccordionProps {
  type?: AccordionType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Accordion({
  value: controlledOpenness,
  defaultValue = undefined,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: AccordionProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createAccordionStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpenness] = useState<string | string[]>((defaultValue ?? undefined) as string | string[]);
  const openness = controlledOpenness !== undefined ? controlledOpenness : uncontrolledOpenness;

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.item}
      >
        <View
          style={styles.header}
        >
          <Pressable
            style={styles.trigger}
            accessibilityRole="button"
            accessibilityState={{ expanded: String(openness) === "true" }}
          >
            {typeof children === "string" ? <RNText>{children}</RNText> : children}
            <Icon
              name="chevron-down"
              size="sm"
            />
          </Pressable>
        </View>
        <View
          style={styles.content}
        >
          <View
            style={styles.contentInner}
          >
            {typeof children === "string" ? <RNText>{children}</RNText> : children}
          </View>
        </View>
      </View>
    </View>
  );
}
// @generated:end
