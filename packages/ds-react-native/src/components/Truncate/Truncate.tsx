// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createTruncateStyles } from "./Truncate.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface TruncateProps {
  lines?: number;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandText?: string;
  collapseText?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const TruncateMessages = { expand: "Show more", collapse: "Show less" };

export function Truncate({
  lines,
  expandable,
  expanded: controlledExpanded,
  expandText: expandTextProp,
  collapseText: collapseTextProp,
  defaultExpanded = false,
  onExpandedChange,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: TruncateProps) {
  const fsdsMessages = useFsdsMessages("Truncate", TruncateMessages);
  const expandText = expandTextProp ?? fsdsMessages.expand;
  const collapseText = collapseTextProp ?? fsdsMessages.collapse;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTruncateStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<boolean>((defaultExpanded ?? false) as boolean);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : uncontrolledExpanded;
  const setExpandedValue = useCallback((next: boolean) => {
    if (controlledExpanded === undefined) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  }, [controlledExpanded, onExpandedChange]);

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.content}
      >
        {typeof children === "string" ? <RNText numberOfLines={expanded ? undefined : lines}>{children}</RNText> : children}
      </View>
      {expandable ? (
      <Pressable
        style={styles.toggle}
        onPress={() => setExpandedValue(!expanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: String(expanded) === "true" }}
      >
        <RNText>{(expanded ? collapseText : expandText)}</RNText>
      </Pressable>
      ) : null}
    </View>
  );
}
// @generated:end
