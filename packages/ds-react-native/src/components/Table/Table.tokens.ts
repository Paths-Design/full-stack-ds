// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const tableTokenScopes = {
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
    "table.color.text": {
      name: "table.color.text",
      cssVar: "--fsds-table-color-text",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "table.color.border": {
      name: "table.color.border",
      cssVar: "--fsds-table-color-border",
      ref: "semantic.surface.border.subtle",
      fallback: "#d0d0d0",
    },
    "table.border.width": {
      name: "table.border.width",
      cssVar: "--fsds-table-border-width",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "table.size.radius": {
      name: "table.size.radius",
      cssVar: "--fsds-table-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "table.text.size": {
      name: "table.text.size",
      cssVar: "--fsds-table-text-size",
      ref: "semantic.typography.body.03",
      fallback: 14,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveTableTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(tableTokenScopes, theme);
}
// @generated:end
