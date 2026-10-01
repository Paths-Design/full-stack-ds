// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const imageTokenScopes = {
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
    "image.color.foreground.primary": {
      name: "image.color.foreground.primary",
      cssVar: "--fsds-image-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "image.size.xs": {
      name: "image.size.xs",
      cssVar: "--fsds-image-size-xs",
      literal: 24,
    },
    "image.size.sm": {
      name: "image.size.sm",
      cssVar: "--fsds-image-size-sm",
      literal: 32,
    },
    "image.size.md": {
      name: "image.size.md",
      cssVar: "--fsds-image-size-md",
      literal: 48,
    },
    "image.size.lg": {
      name: "image.size.lg",
      cssVar: "--fsds-image-size-lg",
      literal: 64,
    },
    "image.size.xl": {
      name: "image.size.xl",
      cssVar: "--fsds-image-size-xl",
      literal: 96,
    },
    "image.radius.none": {
      name: "image.radius.none",
      cssVar: "--fsds-image-radius-none",
      ref: "semantic.shape.radius.none",
      fallback: 0,
    },
    "image.radius.sm": {
      name: "image.radius.sm",
      cssVar: "--fsds-image-radius-sm",
      ref: "semantic.shape.radius.small",
      fallback: 4,
    },
    "image.radius.md": {
      name: "image.radius.md",
      cssVar: "--fsds-image-radius-md",
      ref: "semantic.shape.radius.medium",
      fallback: 8,
    },
    "image.radius.lg": {
      name: "image.radius.lg",
      cssVar: "--fsds-image-radius-lg",
      ref: "semantic.shape.radius.large",
      fallback: 16,
    },
    "image.radius.full": {
      name: "image.radius.full",
      cssVar: "--fsds-image-radius-full",
      ref: "semantic.shape.radius.full",
      fallback: 9999,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveImageTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(imageTokenScopes, theme);
}
// @generated:end
