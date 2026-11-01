// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveLinksTokens } from "./Links.tokens";
// @generated:end

// @generated:start styles
export function createLinksStyles(theme?: FsdsTheme) {
  const tokens = resolveLinksTokens(theme);
  return StyleSheet.create({
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderRadius: (tokens.root?.["links.focus.ring.radius"] as number | undefined), alignItems: "center", justifyContent: "center" },
    rootText: definedStyle({ color: (tokens.root?.["links.color.foreground.default"] as string | undefined), fontSize: (tokens.root?.["links.size.fontSize.medium"] as number | undefined) }),
    rootText_state_disabled: definedStyle({ color: (tokens.root?.["links.color.foreground.disabled"] as string | undefined) }),
    rootText_variant_large: definedStyle({ fontSize: (tokens.variant_large?.["links.size.fontSize.medium"] as number | undefined) }),
    rootText_variant_medium: definedStyle({ fontSize: (tokens.variant_medium?.["links.size.fontSize.medium"] as number | undefined) }),
    rootText_variant_small: definedStyle({ fontSize: (tokens.variant_small?.["links.size.fontSize.medium"] as number | undefined) }),
  });
}

export const styles = createLinksStyles();
// @generated:end
