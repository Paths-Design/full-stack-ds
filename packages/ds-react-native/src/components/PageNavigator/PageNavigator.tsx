// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { usePagedSet } from "../../primitives/hooks/usePaging";
import { useFsdsTheme } from "../../tokens";
import { createPageNavigatorStyles } from "./PageNavigator.styles";
import { useFsdsMessages, formatFsdsMessage } from "../../primitives/messages";
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
const PageNavigatorMessages = { groupLabel: "Page navigation", pageLabel: "Current page", previousPage: "Previous page", nextPage: "Next page", commit: "Go", pageCount: "of {count}" };

export function PageNavigator({
  pages = [],
  index: controlledPage,
  presentation = "indicators",
  label: labelProp,
  disabled = false,
  pageCount,
  pageLabel: pageLabelProp,
  previousLabel: previousLabelProp,
  nextLabel: nextLabelProp,
  commitLabel: commitLabelProp,
  showChoices = false,
  defaultIndex = 0,
  onIndexChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: PageNavigatorProps) {
  const fsdsMessages = useFsdsMessages("PageNavigator", PageNavigatorMessages);
  const label = labelProp ?? fsdsMessages.groupLabel;
  const pageLabel = pageLabelProp ?? fsdsMessages.pageLabel;
  const previousLabel = previousLabelProp ?? fsdsMessages.previousPage;
  const nextLabel = nextLabelProp ?? fsdsMessages.nextPage;
  const commitLabel = commitLabelProp ?? fsdsMessages.commit;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createPageNavigatorStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledPage, setUncontrolledPage] = useState<number>((defaultIndex ?? 0) as number);
  const page = controlledPage !== undefined ? controlledPage : uncontrolledPage;
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
        <RNText>{formatFsdsMessage(fsdsMessages.pageCount, { count: pagedSet.state.count })}</RNText>
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
