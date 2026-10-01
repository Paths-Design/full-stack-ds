// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveNavListTokens } from "./NavList.tokens";
// @generated:end

// @generated:start styles
export function createNavListStyles(theme?: FsdsTheme) {
  const tokens = resolveNavListTokens(theme);
  return StyleSheet.create({
    item: {},
    list: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["nav-list.color.background.default"] as string | undefined), borderRadius: (tokens.root?.["nav-list.size.radius"] as number | undefined) },
  });
}

export const styles = createNavListStyles();
// @generated:end
