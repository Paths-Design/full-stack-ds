// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const popoverTokenScopes = {
  "root": {
    "box-model.padding-block-start": {
      name: "box-model.padding-block-start",
      cssVar: "--fsds-box-model-padding-block-start",
      ref: "semantic.surface.size.padding-block",
      fallback: 16,
    },
    "box-model.padding-block-end": {
      name: "box-model.padding-block-end",
      cssVar: "--fsds-box-model-padding-block-end",
      ref: "semantic.surface.size.padding-block",
      fallback: 16,
    },
    "box-model.padding-inline-start": {
      name: "box-model.padding-inline-start",
      cssVar: "--fsds-box-model-padding-inline-start",
      ref: "semantic.surface.size.padding-inline",
      fallback: 16,
    },
    "box-model.padding-inline-end": {
      name: "box-model.padding-inline-end",
      cssVar: "--fsds-box-model-padding-inline-end",
      ref: "semantic.surface.size.padding-inline",
      fallback: 16,
    },
    "box-model.gap": {
      name: "box-model.gap",
      cssVar: "--fsds-box-model-gap",
      ref: "semantic.surface.size.gap",
      fallback: 8,
    },
    "box-model.min-width": {
      name: "box-model.min-width",
      cssVar: "--fsds-box-model-min-width",
      ref: "semantic.surface.size.min-width",
      fallback: 64,
    },
    "box-model.min-height": {
      name: "box-model.min-height",
      cssVar: "--fsds-box-model-min-height",
      literal: 0,
    },
    "popover.size.radius": {
      name: "popover.size.radius",
      cssVar: "--fsds-popover-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "popover.color.border": {
      name: "popover.color.border",
      cssVar: "--fsds-popover-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
  },
} satisfies ComponentTokenScopes;

export function resolvePopoverTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(popoverTokenScopes, theme);
}
// @generated:end
