// @generated:start imports
import { StyleSheet } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveAvatarTokens } from "./Avatar.tokens";
// @generated:end

// @generated:start styles
export function createAvatarStyles(theme?: FsdsTheme) {
  const tokens = resolveAvatarTokens(theme);
  return StyleSheet.create({
    image: {},
    initials: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["avatar.color.border"] as string | undefined), borderWidth: (tokens.root?.["avatar.size.border"] as number | undefined), borderRadius: (tokens.root?.["avatar.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["avatar.color.foreground.primary"] as string | undefined), fontWeight: (tokens.root?.["avatar.typography.fontWeight.medium"] as TextStyle["fontWeight"]), fontFamily: (tokens.root?.["avatar.typography.fontFamily.sans"] as string | undefined) }),
    root_variant_extra_large: definedStyle({ width: (tokens.root?.["avatar.size.extra-large"] as ViewStyle["width"]), height: (tokens.root?.["avatar.size.extra-large"] as ViewStyle["height"]) }),
    root_variant_large: definedStyle({ width: (tokens.root?.["avatar.size.large"] as ViewStyle["width"]), height: (tokens.root?.["avatar.size.large"] as ViewStyle["height"]) }),
    root_variant_medium: definedStyle({ width: (tokens.root?.["avatar.size.medium"] as ViewStyle["width"]), height: (tokens.root?.["avatar.size.medium"] as ViewStyle["height"]) }),
    root_variant_small: definedStyle({ width: (tokens.root?.["avatar.size.small"] as ViewStyle["width"]), height: (tokens.root?.["avatar.size.small"] as ViewStyle["height"]) }),
    status: {},
  });
}

export const styles = createAvatarStyles();
// @generated:end
