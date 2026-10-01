// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const codeBlockTokenScopes = {
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
      ref: "semantic.display.size.gap",
      fallback: 4,
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
    "code-block.color.foreground.primary": {
      name: "code-block.color.foreground.primary",
      cssVar: "--fsds-code-block-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "code-block.color.border": {
      name: "code-block.color.border",
      cssVar: "--fsds-code-block-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
    "code-block.size.radius": {
      name: "code-block.size.radius",
      cssVar: "--fsds-code-block-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
    "code-block.size.border": {
      name: "code-block.size.border",
      cssVar: "--fsds-code-block-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "code-block.size.fontSize": {
      name: "code-block.size.fontSize",
      cssVar: "--fsds-code-block-size-font-size",
      ref: "core.typography.ramp.3",
      fallback: 14,
    },
    "code-block.token.color.plain": {
      name: "code-block.token.color.plain",
      cssVar: "--fsds-code-block-token-color-plain",
      ref: "semantic.color.foreground.syntax.plain",
      fallback: "#141414",
    },
    "code-block.token.color.comment": {
      name: "code-block.token.color.comment",
      cssVar: "--fsds-code-block-token-color-comment",
      ref: "semantic.color.foreground.syntax.comment.color",
      fallback: "#474647",
    },
    "code-block.token.color.keyword": {
      name: "code-block.token.color.keyword",
      cssVar: "--fsds-code-block-token-color-keyword",
      ref: "semantic.color.foreground.syntax.keyword",
      fallback: "#013ab0",
    },
    "code-block.token.color.definition": {
      name: "code-block.token.color.definition",
      cssVar: "--fsds-code-block-token-color-definition",
      ref: "semantic.color.foreground.syntax.definition",
      fallback: "#900909",
    },
    "code-block.token.color.punctuation": {
      name: "code-block.token.color.punctuation",
      cssVar: "--fsds-code-block-token-color-punctuation",
      ref: "semantic.color.foreground.syntax.punctuation",
      fallback: "#013ab0",
    },
    "code-block.token.color.property": {
      name: "code-block.token.color.property",
      cssVar: "--fsds-code-block-token-color-property",
      ref: "semantic.color.foreground.syntax.property",
      fallback: "#6c3a00",
    },
    "code-block.token.color.static": {
      name: "code-block.token.color.static",
      cssVar: "--fsds-code-block-token-color-static",
      ref: "semantic.color.foreground.syntax.static",
      fallback: "#900909",
    },
    "code-block.token.color.string": {
      name: "code-block.token.color.string",
      cssVar: "--fsds-code-block-token-color-string",
      ref: "semantic.color.foreground.syntax.string",
      fallback: "#900909",
    },
    "code-block.token.color.tag": {
      name: "code-block.token.color.tag",
      cssVar: "--fsds-code-block-token-color-tag",
      ref: "semantic.color.foreground.syntax.tag",
      fallback: "#900909",
    },
    "code-block.gutter.color.number": {
      name: "code-block.gutter.color.number",
      cssVar: "--fsds-code-block-gutter-color-number",
      ref: "semantic.color.foreground.secondary",
      fallback: "#474647",
    },
    "code-block.gutter.size.gap": {
      name: "code-block.gutter.size.gap",
      cssVar: "--fsds-code-block-gutter-size-gap",
      ref: "core.spacing.size.03",
      fallback: 4,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCodeBlockTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(codeBlockTokenScopes, theme);
}
// @generated:end
