// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const postcardTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "semantic.surface.size.padding-block",
      fallback: 16,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "semantic.surface.size.padding-block",
      fallback: 16,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "semantic.surface.size.padding-inline",
      fallback: 16,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "semantic.surface.size.padding-inline",
      fallback: 16,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.surface.size.gap",
      fallback: 8,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      ref: "semantic.surface.size.min-width",
      fallback: 64,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      literal: 0,
    },
    "postcard.color.background.default": {
      name: "postcard.color.background.default",
      cssVar: "--fsds-postcard-color-background-default",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
    "postcard.color.border.default": {
      name: "postcard.color.border.default",
      cssVar: "--fsds-postcard-color-border-default",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "postcard.color.foreground.primary": {
      name: "postcard.color.foreground.primary",
      cssVar: "--fsds-postcard-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "postcard.size.radius": {
      name: "postcard.size.radius",
      cssVar: "--fsds-postcard-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "postcard.size.border": {
      name: "postcard.size.border",
      cssVar: "--fsds-postcard-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
  },
} satisfies ComponentTokenScopes;

export function resolvePostcardTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(postcardTokenScopes, theme);
}
// @generated:end
