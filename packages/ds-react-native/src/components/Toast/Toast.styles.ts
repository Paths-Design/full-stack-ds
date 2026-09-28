// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveToastTokens } from "./Toast.tokens";
// @generated:end

// @generated:start styles
export function createToastStyles(theme?: FsdsTheme) {
  const tokens = resolveToastTokens(theme);
  return StyleSheet.create({
    action: {},
    close: {},
    description: {},
    item: {},
    progress: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderRadius: (tokens.root?.["toast.surface.radius"] as number | undefined) },
    row: {},
    title: {},
    viewport: {},
  });
}

export const styles = createToastStyles();
// @generated:end
