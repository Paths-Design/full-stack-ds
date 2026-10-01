// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const switchTokenScopes = {
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
    "switch.color.track.background": {
      name: "switch.color.track.background",
      cssVar: "--fsds-switch-color-track-background",
      ref: "semantic.color.background.tertiary",
      fallback: "#d0d0d0",
    },
    "switch.color.thumb.background": {
      name: "switch.color.thumb.background",
      cssVar: "--fsds-switch-color-thumb-background",
      ref: "semantic.color.background.primary",
      fallback: "#ffffff",
    },
    "switch.size.md.track.width": {
      name: "switch.size.md.track.width",
      cssVar: "--fsds-switch-size-md-track-width",
      ref: "core.spacing.size.09",
      fallback: 48,
    },
    "switch.size.md.track.height": {
      name: "switch.size.md.track.height",
      cssVar: "--fsds-switch-size-md-track-height",
      ref: "core.spacing.size.07",
      fallback: 24,
    },
    "switch.size.md.track.radius": {
      name: "switch.size.md.track.radius",
      cssVar: "--fsds-switch-size-md-track-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "switch.size.sm.track.width": {
      name: "switch.size.sm.track.width",
      cssVar: "--fsds-switch-size-sm-track-width",
      ref: "core.spacing.size.08",
      fallback: 32,
    },
    "switch.size.sm.track.height": {
      name: "switch.size.sm.track.height",
      cssVar: "--fsds-switch-size-sm-track-height",
      ref: "core.spacing.size.06",
      fallback: 16,
    },
    "switch.size.lg.track.width": {
      name: "switch.size.lg.track.width",
      cssVar: "--fsds-switch-size-lg-track-width",
      ref: "core.spacing.size.10",
      fallback: 64,
    },
    "switch.size.lg.track.height": {
      name: "switch.size.lg.track.height",
      cssVar: "--fsds-switch-size-lg-track-height",
      ref: "core.spacing.size.08",
      fallback: 32,
    },
  },
  "checked": {
    "switch.color.track.background": {
      name: "switch.color.track.background",
      cssVar: "--fsds-switch-color-track-background",
      ref: "semantic.color.foreground.accent",
      fallback: "#d92d2e",
    },
    "switch.color.thumb.background": {
      name: "switch.color.thumb.background",
      cssVar: "--fsds-switch-color-thumb-background",
      ref: "semantic.color.foreground.on.brand",
      fallback: "#ffffff",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveSwitchTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(switchTokenScopes, theme);
}
// @generated:end
