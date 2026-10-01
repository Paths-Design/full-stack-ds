// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveListTokens } from "./List.tokens";
// @generated:end

// @generated:start styles
export function createListStyles(theme?: FsdsTheme) {
  const tokens = resolveListTokens(theme);
  return StyleSheet.create({
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["list.color.border"] as string | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["list.color.foreground.primary"] as string | undefined) }),
    rootText_variant_size_lg: definedStyle({ fontSize: (tokens.root?.["list.size.lg"] as number | undefined) }),
    rootText_variant_size_md: definedStyle({ fontSize: (tokens.root?.["list.size.md"] as number | undefined) }),
    rootText_variant_size_sm: definedStyle({ fontSize: (tokens.root?.["list.size.sm"] as number | undefined) }),
    root_variant_variant_inline: definedStyle({ gap: (tokens.root?.["list.spacing.md"] as number | undefined) }),
  });
}

export const styles = createListStyles();
// @generated:end
