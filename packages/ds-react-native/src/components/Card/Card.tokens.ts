// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const cardTokenScopes = {
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
    "card.color.background.default": {
      name: "card.color.background.default",
      cssVar: "--fsds-card-color-background-default",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
    "card.color.border": {
      name: "card.color.border",
      cssVar: "--fsds-card-color-border",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "card.color.foreground.primary": {
      name: "card.color.foreground.primary",
      cssVar: "--fsds-card-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "card.size.radius": {
      name: "card.size.radius",
      cssVar: "--fsds-card-size-radius",
      ref: "semantic.shape.radius.medium",
      fallback: 8,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCardTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(cardTokenScopes, theme);
}
// @generated:end
