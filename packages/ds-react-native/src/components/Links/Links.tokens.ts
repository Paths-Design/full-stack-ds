// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const linksTokenScopes = {
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
    "links.color.foreground.default": {
      name: "links.color.foreground.default",
      cssVar: "--fsds-links-color-foreground-default",
      ref: "semantic.color.foreground.link",
      fallback: "#d92d2e",
    },
    "links.color.foreground.disabled": {
      name: "links.color.foreground.disabled",
      cssVar: "--fsds-links-color-foreground-disabled",
      ref: "semantic.color.foreground.disabled",
      fallback: "#727272",
    },
    "links.focus.ring.radius": {
      name: "links.focus.ring.radius",
      cssVar: "--fsds-links-focus-ring-radius",
      ref: "semantic.shape.radius.small",
      fallback: 4,
    },
    "links.size.fontSize.small": {
      name: "links.size.fontSize.small",
      cssVar: "--fsds-links-size-font-size-small",
      ref: "core.typography.ramp.3",
      fallback: 14,
    },
    "links.size.fontSize.medium": {
      name: "links.size.fontSize.medium",
      cssVar: "--fsds-links-size-font-size-medium",
      ref: "core.typography.ramp.4",
      fallback: 16,
    },
    "links.size.fontSize.large": {
      name: "links.size.fontSize.large",
      cssVar: "--fsds-links-size-font-size-large",
      ref: "core.typography.ramp.5",
      fallback: 18,
    },
  },
  "variant_small": {
    "links.size.fontSize.medium": {
      name: "links.size.fontSize.medium",
      cssVar: "--fsds-links-size-font-size-medium",
      ref: "links.size.fontSize.small",
      fallback: 14,
    },
  },
  "variant_medium": {
    "links.size.fontSize.medium": {
      name: "links.size.fontSize.medium",
      cssVar: "--fsds-links-size-font-size-medium",
      ref: "core.typography.ramp.4",
      fallback: 16,
    },
  },
  "variant_large": {
    "links.size.fontSize.medium": {
      name: "links.size.fontSize.medium",
      cssVar: "--fsds-links-size-font-size-medium",
      ref: "links.size.fontSize.large",
      fallback: 18,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveLinksTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(linksTokenScopes, theme);
}
// @generated:end
