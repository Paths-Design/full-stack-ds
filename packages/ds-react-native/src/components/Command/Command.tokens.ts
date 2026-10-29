// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const commandTokenScopes = {
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
    "command.color.border": {
      name: "command.color.border",
      cssVar: "--fsds-command-color-border",
      ref: "semantic.surface.border.subtle",
      fallback: "#d0d0d0",
    },
    "command.border.width": {
      name: "command.border.width",
      cssVar: "--fsds-command-border-width",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "command.border.radius": {
      name: "command.border.radius",
      cssVar: "--fsds-command-border-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCommandTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(commandTokenScopes, theme);
}
// @generated:end
