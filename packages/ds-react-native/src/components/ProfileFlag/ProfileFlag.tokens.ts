// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const profileFlagTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      literal: 2,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      literal: 2,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      literal: 4,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      literal: 4,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      literal: 0,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      literal: 0,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "semantic.glyph.size.medium.extent",
      fallback: 16,
    },
    "profile-flag.color.border.default": {
      name: "profile-flag.color.border.default",
      cssVar: "--fsds-profile-flag-color-border-default",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "profile-flag.color.foreground.primary": {
      name: "profile-flag.color.foreground.primary",
      cssVar: "--fsds-profile-flag-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "profile-flag.size.radius": {
      name: "profile-flag.size.radius",
      cssVar: "--fsds-profile-flag-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveProfileFlagTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(profileFlagTokenScopes, theme);
}
// @generated:end
