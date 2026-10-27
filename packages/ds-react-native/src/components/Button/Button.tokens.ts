// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const buttonTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "semantic.action.size.medium.padding-block",
      fallback: 4,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "semantic.action.size.medium.padding-block",
      fallback: 4,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "semantic.action.size.medium.padding-inline",
      fallback: 8,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "semantic.action.size.medium.padding-inline",
      fallback: 8,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.action.size.medium.gap",
      fallback: 8,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      ref: "semantic.action.size.medium.min-width",
      fallback: 32,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "semantic.action.size.medium.min-height",
      fallback: 32,
    },
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      ref: "semantic.color.action.background.primary.default",
      fallback: "#0566fe",
    },
    "button.color.background.active": {
      name: "button.color.background.active",
      cssVar: "--fsds-button-color-background-active",
      ref: "semantic.interaction.background.active",
      fallback: "#d0d0d0",
    },
    "button.color.background.disabled": {
      name: "button.color.background.disabled",
      cssVar: "--fsds-button-color-background-disabled",
      ref: "semantic.color.action.background.primary.disabled",
      fallback: "#b8b8b8",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.inverse",
      fallback: "#fafafa",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      ref: "semantic.color.border.default",
      fallback: "#a0a0a1",
    },
    "button.size.radius": {
      name: "button.size.radius",
      cssVar: "--fsds-button-size-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "button.size.border": {
      name: "button.size.border",
      cssVar: "--fsds-button-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "button.text.weight": {
      name: "button.text.weight",
      cssVar: "--fsds-button-text-weight",
      ref: "semantic.typography.font.weight.medium",
      fallback: "500",
    },
    "button.size.fontSize.medium": {
      name: "button.size.fontSize.medium",
      cssVar: "--fsds-button-size-font-size-medium",
      ref: "semantic.typography.action.02",
      fallback: 16,
    },
  },
  "variant_small": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "core.spacing.size.03",
      fallback: 4,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "core.spacing.size.03",
      fallback: 4,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "core.spacing.size.04",
      fallback: 8,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "core.spacing.size.04",
      fallback: 8,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "core.dimension.actionMinHeightSmall",
      fallback: 28,
    },
    "button.size.fontSize.medium": {
      name: "button.size.fontSize.medium",
      cssVar: "--fsds-button-size-font-size-medium",
      ref: "semantic.typography.action.03",
      fallback: 14,
    },
  },
  "variant_medium": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "core.spacing.size.04",
      fallback: 8,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "core.spacing.size.04",
      fallback: 8,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "core.dimension.actionMinHeight",
      fallback: 36,
    },
    "button.size.fontSize.medium": {
      name: "button.size.fontSize.medium",
      cssVar: "--fsds-button-size-font-size-medium",
      ref: "semantic.typography.action.02",
      fallback: 16,
    },
  },
  "variant_large": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "core.spacing.size.06",
      fallback: 16,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "core.spacing.size.06",
      fallback: 16,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "core.dimension.actionMinHeightLarge",
      fallback: 48,
    },
    "button.size.fontSize.medium": {
      name: "button.size.fontSize.medium",
      cssVar: "--fsds-button-size-font-size-medium",
      ref: "semantic.typography.action.01",
      fallback: 18,
    },
  },
  "variant_primary": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      ref: "semantic.color.action.background.primary.default",
      fallback: "#0566fe",
    },
    "button.color.background.active": {
      name: "button.color.background.active",
      cssVar: "--fsds-button-color-background-active",
      ref: "semantic.color.action.background.primary.active",
      fallback: "#013ab0",
    },
    "button.color.background.disabled": {
      name: "button.color.background.disabled",
      cssVar: "--fsds-button-color-background-disabled",
      ref: "semantic.color.action.background.primary.disabled",
      fallback: "#b8b8b8",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.inverse",
      fallback: "#fafafa",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      ref: "semantic.color.action.background.primary.default",
      fallback: "#0566fe",
    },
  },
  "variant_secondary": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      ref: "semantic.color.action.background.secondary.default",
      fallback: "#fafafa",
    },
    "button.color.background.active": {
      name: "button.color.background.active",
      cssVar: "--fsds-button-color-background-active",
      ref: "semantic.color.action.background.secondary.active",
      fallback: "#b8b8b8",
    },
    "button.color.background.disabled": {
      name: "button.color.background.disabled",
      cssVar: "--fsds-button-color-background-disabled",
      ref: "semantic.color.action.background.secondary.disabled",
      fallback: "#b8b8b8",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      ref: "semantic.color.border.default",
      fallback: "#a0a0a1",
    },
  },
  "variant_tertiary": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      literal: "transparent",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      literal: "transparent",
    },
  },
  "variant_destructive": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      literal: "transparent",
    },
    "button.color.background.active": {
      name: "button.color.background.active",
      cssVar: "--fsds-button-color-background-active",
      ref: "semantic.color.background.danger.subtle",
      fallback: "#fac2c2",
    },
    "button.color.background.disabled": {
      name: "button.color.background.disabled",
      cssVar: "--fsds-button-color-background-disabled",
      ref: "semantic.color.action.background.danger.disabled",
      fallback: "#b8b8b8",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.on.danger.subtle",
      fallback: "#900909",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      ref: "semantic.color.border.danger",
      fallback: "#b31b1b",
    },
  },
  "variant_ghost": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      literal: "transparent",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      literal: "transparent",
    },
  },
  "variant_outline": {
    "button.color.background.default": {
      name: "button.color.background.default",
      cssVar: "--fsds-button-color-background-default",
      literal: "transparent",
    },
    "button.color.foreground.default": {
      name: "button.color.foreground.default",
      cssVar: "--fsds-button-color-foreground-default",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "button.color.border.default": {
      name: "button.color.border.default",
      cssVar: "--fsds-button-color-border-default",
      ref: "semantic.color.border.default",
      fallback: "#a0a0a1",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveButtonTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(buttonTokenScopes, theme);
}
// @generated:end
