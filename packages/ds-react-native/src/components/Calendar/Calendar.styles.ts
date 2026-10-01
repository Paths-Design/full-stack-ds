// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveCalendarTokens } from "./Calendar.tokens";
// @generated:end

// @generated:start styles
export function createCalendarStyles(theme?: FsdsTheme) {
  const tokens = resolveCalendarTokens(theme);
  return StyleSheet.create({
    caption: {},
    cell: {},
    day: {},
    day_state_selected: definedStyle({ backgroundColor: (tokens.root?.["calendar.color.day.selected.background"] as string | undefined) }),
    grid: {},
    header: {},
    nav: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["calendar.color.border"] as string | undefined), borderRadius: (tokens.root?.["calendar.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["calendar.color.foreground.primary"] as string | undefined) }),
  });
}

export const styles = createCalendarStyles();
// @generated:end
