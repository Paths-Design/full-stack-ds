// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { usePagedSet } from "../../primitives/hooks/usePaging";
import { MotionPart, MotionPartScope } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createPaginationStyles } from "./Pagination.styles";
// @generated:end

// @generated:start types
export type PaginationPresentation = "indicators" | "pages";
export type PaginationProgress = "none" | "elapsed";
// @generated:end

// @generated:start props
export interface PaginationProps {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PaginationPresentation;
  label?: string;
  disabled?: boolean;
  progress?: PaginationProgress;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Pagination({
  pages = [],
  index: controlledPage,
  label = "Choose page",
  disabled = false,
  defaultIndex = 0,
  onIndexChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: PaginationProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createPaginationStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledPage, setUncontrolledPage] = useState<number>((defaultIndex ?? 0) as number);
  const page = controlledPage ?? uncontrolledPage;
  const setPageValue = useCallback((next: number) => {
    if (controlledPage === undefined) setUncontrolledPage(next);
    onIndexChange?.(next);
  }, [controlledPage, onIndexChange]);

  const pagedSet = usePagedSet({ index: page, items: pages,
    count: undefined, disabled: disabled, onIndexChange: setPageValue });
  return (
<MotionPartScope>{motionParts => (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {(pages ?? []).map((item, index) => (
          <Pressable
            key={index}
            style={styles.item}
            accessibilityLabel={item}
            disabled={disabled}
            onPress={() => pagedSet.request(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(index === page) && String(index === page) !== "false", disabled: disabled }}
          >
            <View
              style={styles.marker}
              accessible={false}
            >
<MotionPart projection={motionParts["fill"]} index={index} style={styles.fill}>
              <View
                style={styles.fill}
                accessible={false}
              />
</MotionPart>
            </View>
            <View
              style={styles.label}
              accessible={false}
            >
              <RNText>{item}</RNText>
            </View>
          </Pressable>
        ))}
    </View>
)}</MotionPartScope>
  );
}
// @generated:end
