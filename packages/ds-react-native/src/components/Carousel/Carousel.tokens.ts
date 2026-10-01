// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const carouselTokenScopes = {
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
      literal: 0,
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
    "carousel.color.foreground": {
      name: "carousel.color.foreground",
      cssVar: "--fsds-carousel-color-foreground",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "carousel.timing.advance": {
      name: "carousel.timing.advance",
      cssVar: "--fsds-carousel-timing-advance",
      ref: "core.motion.dwell.medium",
      fallback: 6000,
    },
    "carousel.size.radius": {
      name: "carousel.size.radius",
      cssVar: "--fsds-carousel-size-radius",
      ref: "core.shape.radius.full",
      fallback: 9999,
    },
    "carousel.motion.duration": {
      name: "carousel.motion.duration",
      cssVar: "--fsds-carousel-motion-duration",
      ref: "core.motion.duration.medium",
      fallback: 250,
    },
    "carousel.motion.easing": {
      name: "carousel.motion.easing",
      cssVar: "--fsds-carousel-motion-easing",
      ref: "core.motion.easing.standard",
      fallback: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCarouselTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(carouselTokenScopes, theme);
}
// @generated:end
