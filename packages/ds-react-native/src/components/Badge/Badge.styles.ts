// @generated:start imports
import { StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveBadgeTokens } from "./Badge.tokens";
// @generated:end

// @generated:start styles
export function createBadgeStyles(theme?: FsdsTheme) {
  const tokens = resolveBadgeTokens(theme);
  return StyleSheet.create({
    content: {},
    icon: {},
    icon_variant_lg: definedStyle({ width: (tokens.variant_lg?.["badge.size.fontSize"] as number | undefined), height: (tokens.variant_lg?.["badge.size.fontSize"] as number | undefined) }),
    icon_variant_md: definedStyle({ width: (tokens.variant_md?.["badge.size.fontSize"] as number | undefined), height: (tokens.variant_md?.["badge.size.fontSize"] as number | undefined) }),
    icon_variant_sm: definedStyle({ width: (tokens.variant_sm?.["badge.size.fontSize"] as number | undefined), height: (tokens.variant_sm?.["badge.size.fontSize"] as number | undefined) }),
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.root?.["badge.color.border"] as string | undefined), borderWidth: (tokens.root?.["badge.size.border"] as number | undefined), borderRadius: (tokens.root?.["badge.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["badge.color.foreground.primary"] as string | undefined), fontSize: (tokens.root?.["badge.size.fontSize"] as number | undefined), fontWeight: (tokens.root?.["badge.text.weight"] as TextStyle["fontWeight"]) }),
    rootText_variant_counter: definedStyle({ color: (tokens.variant_counter?.["badge.color.foreground.primary"] as string | undefined) }),
    rootText_variant_danger: definedStyle({ color: (tokens.variant_danger?.["badge.color.foreground.primary"] as string | undefined) }),
    rootText_variant_info: definedStyle({ color: (tokens.variant_info?.["badge.color.foreground.primary"] as string | undefined) }),
    rootText_variant_lg: definedStyle({ fontSize: (tokens.variant_lg?.["badge.size.fontSize"] as number | undefined) }),
    rootText_variant_md: definedStyle({ fontSize: (tokens.variant_md?.["badge.size.fontSize"] as number | undefined) }),
    rootText_variant_sm: definedStyle({ fontSize: (tokens.variant_sm?.["badge.size.fontSize"] as number | undefined) }),
    rootText_variant_success: definedStyle({ color: (tokens.variant_success?.["badge.color.foreground.primary"] as string | undefined) }),
    rootText_variant_warning: definedStyle({ color: (tokens.variant_warning?.["badge.color.foreground.primary"] as string | undefined) }),
    root_variant_counter: definedStyle({ backgroundColor: (tokens.variant_counter?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.variant_counter?.["badge.color.border"] as string | undefined) }),
    root_variant_danger: definedStyle({ backgroundColor: (tokens.variant_danger?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.variant_danger?.["badge.color.border"] as string | undefined) }),
    root_variant_info: definedStyle({ backgroundColor: (tokens.variant_info?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.variant_info?.["badge.color.border"] as string | undefined) }),
    root_variant_lg: definedStyle({ gap: (tokens.variant_lg?.["badge.spacing.gap"] as number | undefined), minHeight: (tokens.variant_lg?.["badge.size.minHeight"] as number | undefined) }),
    root_variant_md: definedStyle({ gap: (tokens.variant_md?.["badge.spacing.gap"] as number | undefined), minHeight: (tokens.variant_md?.["badge.size.minHeight"] as number | undefined) }),
    root_variant_sm: definedStyle({ gap: (tokens.variant_sm?.["badge.spacing.gap"] as number | undefined), minHeight: (tokens.variant_sm?.["badge.size.minHeight"] as number | undefined) }),
    root_variant_success: definedStyle({ backgroundColor: (tokens.variant_success?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.variant_success?.["badge.color.border"] as string | undefined) }),
    root_variant_tag: definedStyle({ borderRadius: (tokens.variant_tag?.["badge.size.radius"] as number | undefined) }),
    root_variant_warning: definedStyle({ backgroundColor: (tokens.variant_warning?.["badge.color.background.default"] as string | undefined), borderColor: (tokens.variant_warning?.["badge.color.border"] as string | undefined) }),
  });
}

export const styles = createBadgeStyles();
// @generated:end
