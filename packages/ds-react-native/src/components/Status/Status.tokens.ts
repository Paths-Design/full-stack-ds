// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const statusTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "semantic.glyph.badge.size.md.paddingY",
      fallback: 2,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "semantic.glyph.badge.size.md.paddingY",
      fallback: 2,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "semantic.glyph.badge.size.md.paddingX",
      fallback: 8,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "semantic.glyph.badge.size.md.paddingX",
      fallback: 8,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.glyph.badge.size.md.gap",
      fallback: 4,
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
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.secondary",
      fallback: "#474647",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
    "status.size.radius": {
      name: "status.size.radius",
      cssVar: "--fsds-status-size-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "status.size.fontSize": {
      name: "status.size.fontSize",
      cssVar: "--fsds-status-size-font-size",
      ref: "semantic.glyph.badge.size.md.fontSize",
      fallback: 12,
    },
    "status.size.border": {
      name: "status.size.border",
      cssVar: "--fsds-status-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "status.text.weight": {
      name: "status.text.weight",
      cssVar: "--fsds-status-text-weight",
      ref: "semantic.typography.font.weight.medium",
      fallback: "500",
    },
  },
  "variant_info": {
    "status.color.background": {
      name: "status.color.background",
      cssVar: "--fsds-status-color-background",
      ref: "semantic.color.background.info.subtle",
      fallback: "#95dafb",
    },
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.on.info.subtle",
      fallback: "#013ab0",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.info",
      fallback: "#034fd6",
    },
  },
  "variant_success": {
    "status.color.background": {
      name: "status.color.background",
      cssVar: "--fsds-status-color-background",
      ref: "semantic.color.background.success.subtle",
      fallback: "#b3dba7",
    },
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.on.success.subtle",
      fallback: "#2c4f09",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.success",
      fallback: "#3a6614",
    },
  },
  "variant_warning": {
    "status.color.background": {
      name: "status.color.background",
      cssVar: "--fsds-status-color-background",
      ref: "semantic.color.background.warning.subtle",
      fallback: "#fdc67f",
    },
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.on.warning.subtle",
      fallback: "#6c3a00",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.warning",
      fallback: "#8b4b00",
    },
  },
  "variant_danger": {
    "status.color.background": {
      name: "status.color.background",
      cssVar: "--fsds-status-color-background",
      ref: "semantic.color.background.danger.subtle",
      fallback: "#fac2c2",
    },
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.on.danger.subtle",
      fallback: "#900909",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.danger",
      fallback: "#b31b1b",
    },
  },
  "variant_error": {
    "status.color.background": {
      name: "status.color.background",
      cssVar: "--fsds-status-color-background",
      ref: "semantic.color.background.danger.subtle",
      fallback: "#fac2c2",
    },
    "status.color.foreground.primary": {
      name: "status.color.foreground.primary",
      cssVar: "--fsds-status-color-foreground-primary",
      ref: "semantic.color.foreground.on.danger.subtle",
      fallback: "#900909",
    },
    "status.color.border": {
      name: "status.color.border",
      cssVar: "--fsds-status-color-border",
      ref: "semantic.color.border.danger",
      fallback: "#b31b1b",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveStatusTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(statusTokenScopes, theme);
}
// @generated:end
