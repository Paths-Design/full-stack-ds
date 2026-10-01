// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const detailsTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      literal: 0,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      literal: 0,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      literal: 0,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      literal: 0,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.structure.size.gap",
      fallback: 16,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      literal: 0,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      literal: 0,
    },
    "details.size.radius": {
      name: "details.size.radius",
      cssVar: "--fsds-details-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "details.color.background.default": {
      name: "details.color.background.default",
      cssVar: "--fsds-details-color-background-default",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
    "details.color.foreground.primary": {
      name: "details.color.foreground.primary",
      cssVar: "--fsds-details-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "details.color.border.default": {
      name: "details.color.border.default",
      cssVar: "--fsds-details-color-border-default",
      ref: "semantic.color.border.primary",
      fallback: "#a0a0a1",
    },
  },
  "variant_inline": {
    "details.color.background.default": {
      name: "details.color.background.default",
      cssVar: "--fsds-details-color-background-default",
      ref: "semantic.color.background.secondary",
      fallback: "#f7f7f7",
    },
    "details.color.border.default": {
      name: "details.color.border.default",
      cssVar: "--fsds-details-color-border-default",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveDetailsTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(detailsTokenScopes, theme);
}
// @generated:end
