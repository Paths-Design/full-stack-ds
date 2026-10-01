// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const selectTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "semantic.input.size.medium.padding-block",
      fallback: 4,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "semantic.input.size.medium.padding-block",
      fallback: 4,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "semantic.input.size.medium.padding-inline",
      fallback: 8,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "semantic.input.size.medium.padding-inline",
      fallback: 8,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.input.size.medium.gap",
      fallback: 8,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      literal: 0,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      ref: "semantic.input.size.medium.min-height",
      fallback: 32,
    },
    "select.color.border": {
      name: "select.color.border",
      cssVar: "--fsds-select-color-border",
      ref: "semantic.color.border.primary",
      fallback: "#a0a0a1",
    },
    "select.size.radius": {
      name: "select.size.radius",
      cssVar: "--fsds-select-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "select.size.border": {
      name: "select.size.border",
      cssVar: "--fsds-select-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveSelectTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(selectTokenScopes, theme);
}
// @generated:end
