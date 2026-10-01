// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveProgressTokens } from "./Progress.tokens";
// @generated:end

// @generated:start styles
export function createProgressStyles(theme?: FsdsTheme) {
  const tokens = resolveProgressTokens(theme);
  return StyleSheet.create({
    fill: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["progress.color.text"] as string | undefined) }),
    track: {},
    value: {},
  });
}

export const styles = createProgressStyles();
// @generated:end
