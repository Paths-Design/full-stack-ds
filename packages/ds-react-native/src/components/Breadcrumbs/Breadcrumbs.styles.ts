// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveBreadcrumbsTokens } from "./Breadcrumbs.tokens";
// @generated:end

// @generated:start styles
export function createBreadcrumbsStyles(theme?: FsdsTheme) {
  const tokens = resolveBreadcrumbsTokens(theme);
  return StyleSheet.create({
    current: {},
    item: {},
    link: {},
    list: { alignItems: "center", flexWrap: "wrap", flexDirection: "row", gap: (tokens.root?.["breadcrumbs.spacing.gap"] as number | undefined) },
    overflow: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["breadcrumbs.color.border.subtle"] as string | undefined), borderRadius: (tokens.root?.["breadcrumbs.shape.radius.medium"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["breadcrumbs.color.foreground.primary"] as string | undefined) }),
    separator: {},
  });
}

export const styles = createBreadcrumbsStyles();
// @generated:end
