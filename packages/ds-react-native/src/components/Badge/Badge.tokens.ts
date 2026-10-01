// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const badgeTokenScopes = {
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
      literal: 8,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      literal: 8,
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
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.secondary",
      fallback: "#f7f7f7",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
    "badge.size.radius": {
      name: "badge.size.radius",
      cssVar: "--fsds-badge-size-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "badge.size.border": {
      name: "badge.size.border",
      cssVar: "--fsds-badge-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "badge.size.fontSize": {
      name: "badge.size.fontSize",
      cssVar: "--fsds-badge-size-font-size",
      ref: "semantic.glyph.badge.size.md.fontSize",
      fallback: 12,
    },
    "badge.text.weight": {
      name: "badge.text.weight",
      cssVar: "--fsds-badge-text-weight",
      ref: "semantic.typography.font.weight.medium",
      fallback: "500",
    },
  },
  "variant_sm": {
    "badge.size.fontSize": {
      name: "badge.size.fontSize",
      cssVar: "--fsds-badge-size-font-size",
      ref: "semantic.glyph.badge.size.sm.fontSize",
      fallback: 10,
    },
    "badge.size.minHeight": {
      name: "badge.size.minHeight",
      cssVar: "--fsds-badge-size-min-height",
      ref: "semantic.glyph.badge.size.sm.minHeight",
      fallback: 16,
    },
    "badge.spacing.gap": {
      name: "badge.spacing.gap",
      cssVar: "--fsds-badge-spacing-gap",
      ref: "semantic.glyph.badge.size.sm.gap",
      fallback: 2,
    },
  },
  "variant_md": {
    "badge.size.fontSize": {
      name: "badge.size.fontSize",
      cssVar: "--fsds-badge-size-font-size",
      ref: "semantic.glyph.badge.size.md.fontSize",
      fallback: 12,
    },
    "badge.size.minHeight": {
      name: "badge.size.minHeight",
      cssVar: "--fsds-badge-size-min-height",
      ref: "semantic.glyph.badge.size.md.minHeight",
      fallback: 24,
    },
    "badge.spacing.gap": {
      name: "badge.spacing.gap",
      cssVar: "--fsds-badge-spacing-gap",
      ref: "semantic.glyph.badge.size.md.gap",
      fallback: 4,
    },
  },
  "variant_lg": {
    "badge.size.fontSize": {
      name: "badge.size.fontSize",
      cssVar: "--fsds-badge-size-font-size",
      ref: "semantic.glyph.badge.size.lg.fontSize",
      fallback: 14,
    },
    "badge.size.minHeight": {
      name: "badge.size.minHeight",
      cssVar: "--fsds-badge-size-min-height",
      ref: "semantic.glyph.badge.size.lg.minHeight",
      fallback: 32,
    },
    "badge.spacing.gap": {
      name: "badge.spacing.gap",
      cssVar: "--fsds-badge-spacing-gap",
      ref: "semantic.glyph.badge.size.lg.gap",
      fallback: 4,
    },
  },
  "variant_info": {
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.info.subtle",
      fallback: "#95dafb",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.on.info.subtle",
      fallback: "#013ab0",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.border.info",
      fallback: "#034fd6",
    },
  },
  "variant_success": {
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.success.subtle",
      fallback: "#b3dba7",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.on.success.subtle",
      fallback: "#2c4f09",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.border.success",
      fallback: "#3a6614",
    },
  },
  "variant_warning": {
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.warning.subtle",
      fallback: "#fdc67f",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.on.warning.subtle",
      fallback: "#6c3a00",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.border.warning",
      fallback: "#8b4b00",
    },
  },
  "variant_danger": {
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.danger.subtle",
      fallback: "#fac2c2",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.on.danger.subtle",
      fallback: "#900909",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.border.danger",
      fallback: "#b31b1b",
    },
  },
  "variant_counter": {
    "badge.color.background.default": {
      name: "badge.color.background.default",
      cssVar: "--fsds-badge-color-background-default",
      ref: "semantic.color.background.danger.strong",
      fallback: "#b31b1b",
    },
    "badge.color.foreground.primary": {
      name: "badge.color.foreground.primary",
      cssVar: "--fsds-badge-color-foreground-primary",
      ref: "semantic.color.foreground.inverse",
      fallback: "#fafafa",
    },
    "badge.color.border": {
      name: "badge.color.border",
      cssVar: "--fsds-badge-color-border",
      ref: "semantic.color.background.danger.strong",
      fallback: "#b31b1b",
    },
  },
  "variant_tag": {
    "badge.size.radius": {
      name: "badge.size.radius",
      cssVar: "--fsds-badge-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveBadgeTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(badgeTokenScopes, theme);
}
// @generated:end
