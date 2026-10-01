// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const blockquoteTokenScopes = {
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
    "blockquote.color.foreground.primary": {
      name: "blockquote.color.foreground.primary",
      cssVar: "--fsds-blockquote-color-foreground-primary",
      ref: "semantic.color.foreground.secondary",
      fallback: "#474647",
    },
    "blockquote.color.border": {
      name: "blockquote.color.border",
      cssVar: "--fsds-blockquote-color-border",
      ref: "semantic.color.border.accent",
      fallback: "#d92d2e",
    },
    "blockquote.typography.fontWeight": {
      name: "blockquote.typography.fontWeight",
      cssVar: "--fsds-blockquote-typography-font-weight",
      ref: "semantic.typography.font.weight.medium",
      fallback: "500",
    },
    "blockquote.size.padding": {
      name: "blockquote.size.padding",
      cssVar: "--fsds-blockquote-size-padding",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
    "blockquote.size.radius": {
      name: "blockquote.size.radius",
      cssVar: "--fsds-blockquote-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "blockquote.size.border.accent": {
      name: "blockquote.size.border.accent",
      cssVar: "--fsds-blockquote-size-border-accent",
      ref: "core.spacing.size.03",
      fallback: 4,
    },
    "blockquote.size.fontSize.sm": {
      name: "blockquote.size.fontSize.sm",
      cssVar: "--fsds-blockquote-size-font-size-sm",
      ref: "core.typography.ramp.3",
      fallback: 14,
    },
    "blockquote.size.fontSize.md": {
      name: "blockquote.size.fontSize.md",
      cssVar: "--fsds-blockquote-size-font-size-md",
      ref: "core.typography.ramp.4",
      fallback: 16,
    },
    "blockquote.size.fontSize.lg": {
      name: "blockquote.size.fontSize.lg",
      cssVar: "--fsds-blockquote-size-font-size-lg",
      ref: "core.typography.ramp.5",
      fallback: 18,
    },
  },
  "variant_default": {
    "blockquote.color.background": {
      name: "blockquote.color.background",
      cssVar: "--fsds-blockquote-color-background",
      ref: "semantic.color.background.secondary",
      fallback: "#f7f7f7",
    },
  },
  "variant_bordered": {
    "blockquote.color.background": {
      name: "blockquote.color.background",
      cssVar: "--fsds-blockquote-color-background",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
  },
  "variant_highlighted": {
    "blockquote.color.background": {
      name: "blockquote.color.background",
      cssVar: "--fsds-blockquote-color-background",
      ref: "semantic.color.background.accentSubtle",
      fallback: "#95dafb",
    },
    "blockquote.color.foreground.primary": {
      name: "blockquote.color.foreground.primary",
      cssVar: "--fsds-blockquote-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
  },
  "variant_sm": {
    "blockquote.size.fontSize.md": {
      name: "blockquote.size.fontSize.md",
      cssVar: "--fsds-blockquote-size-font-size-md",
      ref: "blockquote.size.fontSize.sm",
      fallback: 14,
    },
  },
  "variant_md": {
    "blockquote.size.fontSize.md": {
      name: "blockquote.size.fontSize.md",
      cssVar: "--fsds-blockquote-size-font-size-md",
      ref: "core.typography.ramp.4",
      fallback: 16,
    },
  },
  "variant_lg": {
    "blockquote.size.fontSize.md": {
      name: "blockquote.size.fontSize.md",
      cssVar: "--fsds-blockquote-size-font-size-md",
      ref: "blockquote.size.fontSize.lg",
      fallback: 18,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveBlockquoteTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(blockquoteTokenScopes, theme);
}
// @generated:end
