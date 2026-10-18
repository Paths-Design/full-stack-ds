// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createShowMoreStyles } from "./ShowMore.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface ShowMoreProps {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxLines?: number;
  showMoreLabel?: string;
  showLessLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const ShowMoreMessages = { showMore: "Show more", showLess: "Show less" };

export function ShowMore({
  expanded: controlledExpanded,
  maxLines = 3,
  showMoreLabel: showMoreLabelProp,
  showLessLabel: showLessLabelProp,
  defaultExpanded = false,
  onExpandedChange,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ShowMoreProps) {
  const fsdsMessages = useFsdsMessages("ShowMore", ShowMoreMessages);
  const showMoreLabel = showMoreLabelProp ?? fsdsMessages.showMore;
  const showLessLabel = showLessLabelProp ?? fsdsMessages.showLess;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createShowMoreStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<boolean>((defaultExpanded ?? false) as boolean);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
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
        {typeof children === "string" ? <RNText numberOfLines={expanded ? undefined : maxLines}>{children}</RNText> : children}
      </View>
      <Pressable
        style={styles.trigger}
        onPress={() => setExpandedValue(!expanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: String(expanded) === "true" }}
      >
        <RNText>{(expanded ? showLessLabel : showMoreLabel)}</RNText>
      </Pressable>
    </View>
  );
}
// @generated:end
