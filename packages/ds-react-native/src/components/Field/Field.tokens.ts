// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const fieldTokenScopes = {
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
      literal: 0,
    },
    "field.gap.meta": {
      name: "field.gap.meta",
      cssVar: "--fsds-field-gap-meta",
      ref: "core.spacing.size.03",
      fallback: 4,
    },
    "field.color.fg": {
      name: "field.color.fg",
      cssVar: "--fsds-field-color-fg",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "field.color.invalid-text": {
      name: "field.color.invalid-text",
      cssVar: "--fsds-field-color-invalid-text",
      ref: "semantic.color.foreground.danger",
      fallback: "#d92d2e",
    },
    "field.label.color": {
      name: "field.label.color",
      cssVar: "--fsds-field-label-color",
      ref: "semantic.color.foreground.secondary",
      fallback: "#474647",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveFieldTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(fieldTokenScopes, theme);
}
// @generated:end
