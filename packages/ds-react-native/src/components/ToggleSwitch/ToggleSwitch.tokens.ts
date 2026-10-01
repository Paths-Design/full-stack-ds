// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const toggleSwitchTokenScopes = {
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
    "toggle-switch.color.background.default": {
      name: "toggle-switch.color.background.default",
      cssVar: "--fsds-toggle-switch-color-background-default",
      ref: "semantic.color.background.secondary",
      fallback: "#f7f7f7",
    },
    "toggle-switch.color.border": {
      name: "toggle-switch.color.border",
      cssVar: "--fsds-toggle-switch-color-border",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "toggle-switch.border.radius": {
      name: "toggle-switch.border.radius",
      cssVar: "--fsds-toggle-switch-border-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "toggle-switch.color.background.checked": {
      name: "toggle-switch.color.background.checked",
      cssVar: "--fsds-toggle-switch-color-background-checked",
      ref: "semantic.color.action.background.primary.default",
      fallback: "#0566fe",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveToggleSwitchTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(toggleSwitchTokenScopes, theme);
}
// @generated:end
