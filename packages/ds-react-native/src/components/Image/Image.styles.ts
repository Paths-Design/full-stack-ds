// @generated:start imports
import { StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveImageTokens } from "./Image.tokens";
// @generated:end

// @generated:start styles
export function createImageStyles(theme?: FsdsTheme) {
  const tokens = resolveImageTokens(theme);
  return StyleSheet.create({
    errorState: {},
    img: {},
    placeholder: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderRadius: (tokens.root?.["image.radius.none"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["image.color.foreground.primary"] as string | undefined) }),
    root_variant_radius_full: definedStyle({ borderRadius: (tokens.root?.["image.radius.full"] as number | undefined) }),
    root_variant_radius_lg: definedStyle({ borderRadius: (tokens.root?.["image.radius.lg"] as number | undefined) }),
    root_variant_radius_md: definedStyle({ borderRadius: (tokens.root?.["image.radius.md"] as number | undefined) }),
    root_variant_radius_none: definedStyle({ borderRadius: (tokens.root?.["image.radius.none"] as number | undefined) }),
    root_variant_radius_sm: definedStyle({ borderRadius: (tokens.root?.["image.radius.sm"] as number | undefined) }),
    root_variant_size_full: definedStyle({ width: "100%", height: "auto" }),
    root_variant_size_lg: definedStyle({ width: (tokens.root?.["image.size.lg"] as ViewStyle["width"]), height: (tokens.root?.["image.size.lg"] as ViewStyle["height"]) }),
    root_variant_size_md: definedStyle({ width: (tokens.root?.["image.size.md"] as ViewStyle["width"]), height: (tokens.root?.["image.size.md"] as ViewStyle["height"]) }),
    root_variant_size_sm: definedStyle({ width: (tokens.root?.["image.size.sm"] as ViewStyle["width"]), height: (tokens.root?.["image.size.sm"] as ViewStyle["height"]) }),
    root_variant_size_xl: definedStyle({ width: (tokens.root?.["image.size.xl"] as ViewStyle["width"]), height: (tokens.root?.["image.size.xl"] as ViewStyle["height"]) }),
    root_variant_size_xs: definedStyle({ width: (tokens.root?.["image.size.xs"] as ViewStyle["width"]), height: (tokens.root?.["image.size.xs"] as ViewStyle["height"]) }),
  });
}

export const styles = createImageStyles();
// @generated:end
