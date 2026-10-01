// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const listTokenScopes = {
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
    "list.color.foreground.primary": {
      name: "list.color.foreground.primary",
      cssVar: "--fsds-list-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "list.color.border": {
      name: "list.color.border",
      cssVar: "--fsds-list-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
    "list.size.sm": {
      name: "list.size.sm",
      cssVar: "--fsds-list-size-sm",
      ref: "semantic.typography.body.03",
      fallback: 14,
    },
    "list.size.md": {
      name: "list.size.md",
      cssVar: "--fsds-list-size-md",
      ref: "semantic.typography.body.02",
      fallback: 16,
    },
    "list.size.lg": {
      name: "list.size.lg",
      cssVar: "--fsds-list-size-lg",
      ref: "semantic.typography.body.01",
      fallback: 18,
    },
    "list.spacing.md": {
      name: "list.spacing.md",
      cssVar: "--fsds-list-spacing-md",
      ref: "core.spacing.size.05",
      fallback: 12,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveListTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(listTokenScopes, theme);
}
// @generated:end
