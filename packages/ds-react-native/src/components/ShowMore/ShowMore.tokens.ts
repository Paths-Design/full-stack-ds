// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const showMoreTokenScopes = {
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
    "show-more.color.foreground.secondary": {
      name: "show-more.color.foreground.secondary",
      cssVar: "--fsds-show-more-color-foreground-secondary",
      ref: "semantic.color.foreground.secondary",
      fallback: "#474647",
    },
    "show-more.color.border": {
      name: "show-more.color.border",
      cssVar: "--fsds-show-more-color-border",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "show-more.size.radius": {
      name: "show-more.size.radius",
      cssVar: "--fsds-show-more-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveShowMoreTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(showMoreTokenScopes, theme);
}
// @generated:end
