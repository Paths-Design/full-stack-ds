// @generated:start imports
import { StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveButtonTokens } from "./Button.tokens";
// @generated:end

// @generated:start styles
export function createButtonStyles(theme?: FsdsTheme) {
  const tokens = resolveButtonTokens(theme);
  return StyleSheet.create({
    loadingText: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["button.color.background.default"] as string | undefined), borderColor: (tokens.root?.["button.color.border.default"] as string | undefined), borderWidth: (tokens.root?.["button.size.border"] as number | undefined), borderRadius: (tokens.root?.["button.size.radius"] as number | undefined), alignItems: "center", justifyContent: "center" },
    rootText: definedStyle({ color: (tokens.root?.["button.color.foreground.default"] as string | undefined), fontSize: (tokens.root?.["button.size.fontSize.medium"] as number | undefined), fontWeight: (tokens.root?.["button.text.weight"] as TextStyle["fontWeight"]) }),
    rootText_state_disabled: definedStyle({ color: (tokens.root?.["button.color.foreground.disabled"] as string | undefined) }),
    rootText_variant_destructive: definedStyle({ color: (tokens.variant_destructive?.["button.color.foreground.default"] as string | undefined) }),
    rootText_variant_ghost: definedStyle({ color: (tokens.variant_ghost?.["button.color.foreground.default"] as string | undefined) }),
    rootText_variant_large: definedStyle({ fontSize: (tokens.variant_large?.["button.size.fontSize.medium"] as number | undefined) }),
    rootText_variant_medium: definedStyle({ fontSize: (tokens.variant_medium?.["button.size.fontSize.medium"] as number | undefined) }),
    rootText_variant_outline: definedStyle({ color: (tokens.variant_outline?.["button.color.foreground.default"] as string | undefined) }),
    rootText_variant_primary: definedStyle({ color: (tokens.variant_primary?.["button.color.foreground.default"] as string | undefined) }),
    rootText_variant_secondary: definedStyle({ color: (tokens.variant_secondary?.["button.color.foreground.default"] as string | undefined) }),
    rootText_variant_small: definedStyle({ fontSize: (tokens.variant_small?.["button.size.fontSize.medium"] as number | undefined) }),
    rootText_variant_tertiary: definedStyle({ color: (tokens.variant_tertiary?.["button.color.foreground.default"] as string | undefined) }),
    root_state_disabled: definedStyle({ backgroundColor: (tokens.root?.["button.color.background.disabled"] as string | undefined) }),
    root_state_pressed: definedStyle({ backgroundColor: (tokens.root?.["button.color.background.active"] as string | undefined) }),
    root_variant_destructive: definedStyle({ backgroundColor: (tokens.variant_destructive?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_destructive?.["button.color.border.default"] as string | undefined) }),
    root_variant_destructive_disabled: definedStyle({ backgroundColor: (tokens.variant_destructive?.["button.color.background.disabled"] as string | undefined) }),
    root_variant_destructive_pressed: definedStyle({ backgroundColor: (tokens.variant_destructive?.["button.color.background.active"] as string | undefined) }),
    root_variant_ghost: definedStyle({ backgroundColor: (tokens.variant_ghost?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_ghost?.["button.color.border.default"] as string | undefined) }),
    root_variant_large: definedStyle({ paddingTop: (tokens.variant_large?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.variant_large?.["box-model.padding-block-end"] as number | undefined), paddingLeft: (tokens.variant_large?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.variant_large?.["box-model.padding-inline-end"] as number | undefined), minHeight: (tokens.variant_large?.["box-model.min-height"] as number | undefined) }),
    root_variant_medium: definedStyle({ paddingTop: (tokens.variant_medium?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.variant_medium?.["box-model.padding-block-end"] as number | undefined), paddingLeft: (tokens.variant_medium?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.variant_medium?.["box-model.padding-inline-end"] as number | undefined), minHeight: (tokens.variant_medium?.["box-model.min-height"] as number | undefined) }),
    root_variant_outline: definedStyle({ backgroundColor: (tokens.variant_outline?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_outline?.["button.color.border.default"] as string | undefined) }),
    root_variant_primary: definedStyle({ backgroundColor: (tokens.variant_primary?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_primary?.["button.color.border.default"] as string | undefined) }),
    root_variant_primary_disabled: definedStyle({ backgroundColor: (tokens.variant_primary?.["button.color.background.disabled"] as string | undefined) }),
    root_variant_primary_pressed: definedStyle({ backgroundColor: (tokens.variant_primary?.["button.color.background.active"] as string | undefined) }),
    root_variant_secondary: definedStyle({ backgroundColor: (tokens.variant_secondary?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_secondary?.["button.color.border.default"] as string | undefined) }),
    root_variant_secondary_disabled: definedStyle({ backgroundColor: (tokens.variant_secondary?.["button.color.background.disabled"] as string | undefined) }),
    root_variant_secondary_pressed: definedStyle({ backgroundColor: (tokens.variant_secondary?.["button.color.background.active"] as string | undefined) }),
    root_variant_small: definedStyle({ paddingTop: (tokens.variant_small?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.variant_small?.["box-model.padding-block-end"] as number | undefined), paddingLeft: (tokens.variant_small?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.variant_small?.["box-model.padding-inline-end"] as number | undefined), minHeight: (tokens.variant_small?.["box-model.min-height"] as number | undefined) }),
    root_variant_tertiary: definedStyle({ backgroundColor: (tokens.variant_tertiary?.["button.color.background.default"] as string | undefined), borderColor: (tokens.variant_tertiary?.["button.color.border.default"] as string | undefined) }),
    spinner: {},
    spinner_variant_large: definedStyle({ width: (tokens.variant_large?.["button.size.fontSize.medium"] as number | undefined), height: (tokens.variant_large?.["button.size.fontSize.medium"] as number | undefined) }),
    spinner_variant_medium: definedStyle({ width: (tokens.variant_medium?.["button.size.fontSize.medium"] as number | undefined), height: (tokens.variant_medium?.["button.size.fontSize.medium"] as number | undefined) }),
    spinner_variant_small: definedStyle({ width: (tokens.variant_small?.["button.size.fontSize.medium"] as number | undefined), height: (tokens.variant_small?.["button.size.fontSize.medium"] as number | undefined) }),
  });
}

export const styles = createButtonStyles();
// @generated:end
