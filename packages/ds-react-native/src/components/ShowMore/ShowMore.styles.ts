// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveShowMoreTokens } from "./ShowMore.tokens";
// @generated:end

// @generated:start styles
export function createShowMoreStyles(theme?: FsdsTheme) {
  const tokens = resolveShowMoreTokens(theme);
  return StyleSheet.create({
    content: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["show-more.color.border"] as string | undefined), borderRadius: (tokens.root?.["show-more.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["show-more.color.foreground.secondary"] as string | undefined) }),
    trigger: {},
  });
}

export const styles = createShowMoreStyles();
// @generated:end
