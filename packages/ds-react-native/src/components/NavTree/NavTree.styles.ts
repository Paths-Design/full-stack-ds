// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveNavTreeTokens } from "./NavTree.tokens";
// @generated:end

// @generated:start styles
export function createNavTreeStyles(theme?: FsdsTheme) {
  const tokens = resolveNavTreeTokens(theme);
  return StyleSheet.create({
    heading: {},
    headingLabel: {},
    headingLink: {},
    icon: {},
    item: {},
    list: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderRadius: (tokens.root?.["nav-tree.size.radius"] as number | undefined) },
  });
}

export const styles = createNavTreeStyles();
// @generated:end
