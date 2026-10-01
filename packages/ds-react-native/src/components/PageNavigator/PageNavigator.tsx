// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { usePagedSet } from "../../primitives/hooks/usePaging";
import { useFsdsTheme } from "../../tokens";
import { createPageNavigatorStyles } from "./PageNavigator.styles";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { Input } from "../Input/Input";
import { Pagination } from "../Pagination/Pagination";
// @generated:end

// @generated:start types
export type PageNavigatorPresentation = "indicators" | "pages";
// @generated:end

// @generated:start props
export interface PageNavigatorProps {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PageNavigatorPresentation;
  label?: string;
  disabled?: boolean;
  pageCount?: number;
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  ofLabel?: string;
  commitLabel?: string;
  showChoices?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function PageNavigator({
  pages = [],
  index: controlledPage,
  presentation = "indicators",
  label = "Page navigation",
  disabled = false,
  pageCount,
  pageLabel = "Current page",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  ofLabel = "of",
  commitLabel = "Go",
  showChoices = false,
  defaultIndex = 0,
  onIndexChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: PageNavigatorProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createPageNavigatorStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledPage, setUncontrolledPage] = useState<number>((defaultIndex ?? 0) as number);
  const page = controlledPage ?? uncontrolledPage;
  const setPageValue = useCallback((next: number) => {
    if (controlledPage === undefined) setUncontrolledPage(next);
    onIndexChange?.(next);
  }, [controlledPage, onIndexChange]);

  const pagedSet = usePagedSet({ index: page, items: pages,
    count: pageCount, disabled: disabled, onIndexChange: setPageValue });
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <Button
        disabled={pagedSet.state.previousDisabled}
        ariaLabel={previousLabel}
        type="button"
        onClick={pagedSet.previous}
      >
        <Icon
          name="arrow-left"
          size="sm"
        />
      </Button>
      <View
        style={styles.field}
      >
        <Input
          value={pagedSet.state.draft}
          disabled={pagedSet.state.disabled}
          ariaLabel={pageLabel}
          type="number"
          onChange={pagedSet.edit}
        />
      </View>
      <View
        style={styles.context}
      >
        <RNText>{ofLabel}</RNText>
      </View>
      <View
        style={styles.total}
      >
        <RNText>{pagedSet.state.count}</RNText>
      </View>
      <Button
        disabled={pagedSet.state.disabled}
        ariaLabel={commitLabel}
        type="button"
        onClick={pagedSet.commit}
      >
        <View
          style={styles.root}
        >
          <RNText>{commitLabel}</RNText>
        </View>
      </Button>
      <Button
        disabled={pagedSet.state.nextDisabled}
        ariaLabel={nextLabel}
        type="button"
        onClick={pagedSet.next}
      >
        <Icon
          name="arrow-right"
          size="sm"
        />
      </Button>
      {showChoices ? (
      <Pagination
        pages={pages}
        index={page}
        presentation={presentation}
        label={label}
        disabled={pagedSet.state.disabled}
        onIndexChange={pagedSet.request}
      />
      ) : null}
    </View>
  );
}
// @generated:end
