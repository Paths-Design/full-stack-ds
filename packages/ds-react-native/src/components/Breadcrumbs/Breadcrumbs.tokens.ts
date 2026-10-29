// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const breadcrumbsTokenScopes = {
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
    "breadcrumbs.color.foreground.primary": {
      name: "breadcrumbs.color.foreground.primary",
      cssVar: "--fsds-breadcrumbs-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "breadcrumbs.color.border.subtle": {
      name: "breadcrumbs.color.border.subtle",
      cssVar: "--fsds-breadcrumbs-color-border-subtle",
      ref: "semantic.surface.border.subtle",
      fallback: "#d0d0d0",
    },
    "breadcrumbs.shape.radius.medium": {
      name: "breadcrumbs.shape.radius.medium",
      cssVar: "--fsds-breadcrumbs-shape-radius-medium",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveBreadcrumbsTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(breadcrumbsTokenScopes, theme);
}
// @generated:end
