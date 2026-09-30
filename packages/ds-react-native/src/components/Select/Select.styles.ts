// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveSelectTokens } from "./Select.tokens";
// @generated:end

// @generated:start styles
export function createSelectStyles(theme?: FsdsTheme) {
  const tokens = resolveSelectTokens(theme);
  return StyleSheet.create({
    content: {},
    emptyState: {},
    option: {},
    options: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["select.color.background.default"] as string | undefined), borderColor: (tokens.root?.["select.color.border.default"] as string | undefined), borderWidth: (tokens.root?.["select.size.border.default"] as number | undefined), borderRadius: (tokens.root?.["select.size.radius.default"] as number | undefined) },
    search: {},
    searchInput: {},
    text: {},
    trigger: {},
  });
}

export const styles = createSelectStyles();
// @generated:end
