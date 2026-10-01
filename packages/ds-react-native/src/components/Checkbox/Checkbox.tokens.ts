// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const checkboxTokenScopes = {
  "root": {
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
    "checkbox.border.width": {
      name: "checkbox.border.width",
      cssVar: "--fsds-checkbox-border-width",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "checkbox.border.radius": {
      name: "checkbox.border.radius",
      cssVar: "--fsds-checkbox-border-radius",
      ref: "semantic.shape.radius.small",
      fallback: 4,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCheckboxTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(checkboxTokenScopes, theme);
}
// @generated:end
