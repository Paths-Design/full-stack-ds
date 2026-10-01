// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const inputTokenScopes = {
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
    "input.color.bg.default": {
      name: "input.color.bg.default",
      cssVar: "--fsds-input-color-bg-default",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
    "input.color.bg.disabled": {
      name: "input.color.bg.disabled",
      cssVar: "--fsds-input-color-bg-disabled",
      ref: "semantic.interaction.background.disabled",
      fallback: "#b8b8b8",
    },
    "input.color.text.default": {
      name: "input.color.text.default",
      cssVar: "--fsds-input-color-text-default",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "input.color.border.default": {
      name: "input.color.border.default",
      cssVar: "--fsds-input-color-border-default",
      ref: "semantic.color.border.default",
      fallback: "#a0a0a1",
    },
    "input.color.border.disabled": {
      name: "input.color.border.disabled",
      cssVar: "--fsds-input-color-border-disabled",
      ref: "semantic.color.border.disabled",
      fallback: "#b8b8b8",
    },
    "input.size.radius": {
      name: "input.size.radius",
      cssVar: "--fsds-input-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "input.size.border": {
      name: "input.size.border",
      cssVar: "--fsds-input-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "input.typography.size": {
      name: "input.typography.size",
      cssVar: "--fsds-input-typography-size",
      ref: "semantic.typography.body.02",
      fallback: 16,
    },
    "input.opacity.disabled": {
      name: "input.opacity.disabled",
      cssVar: "--fsds-input-opacity-disabled",
      ref: "semantic.interaction.disabled.opacity",
      fallback: "0.5",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveInputTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(inputTokenScopes, theme);
}
// @generated:end
