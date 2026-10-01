// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const avatarTokenScopes = {
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
    "avatar.size.small": {
      name: "avatar.size.small",
      cssVar: "--fsds-avatar-size-small",
      ref: "core.spacing.size.06",
      fallback: 16,
    },
    "avatar.size.medium": {
      name: "avatar.size.medium",
      cssVar: "--fsds-avatar-size-medium",
      ref: "core.spacing.size.07",
      fallback: 24,
    },
    "avatar.size.large": {
      name: "avatar.size.large",
      cssVar: "--fsds-avatar-size-large",
      ref: "core.spacing.size.08",
      fallback: 32,
    },
    "avatar.size.extra-large": {
      name: "avatar.size.extra-large",
      cssVar: "--fsds-avatar-size-extra-large",
      ref: "core.spacing.size.09",
      fallback: 48,
    },
    "avatar.size.radius": {
      name: "avatar.size.radius",
      cssVar: "--fsds-avatar-size-radius",
      ref: "semantic.shape.control.radius.pill",
      fallback: 9999,
    },
    "avatar.size.border": {
      name: "avatar.size.border",
      cssVar: "--fsds-avatar-size-border",
      ref: "semantic.shape.control.border.defaultWidth",
      fallback: 1,
    },
    "avatar.color.foreground.primary": {
      name: "avatar.color.foreground.primary",
      cssVar: "--fsds-avatar-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "avatar.color.border": {
      name: "avatar.color.border",
      cssVar: "--fsds-avatar-color-border",
      ref: "semantic.color.border.light",
      fallback: "#b8b8b8",
    },
    "avatar.typography.fontWeight.medium": {
      name: "avatar.typography.fontWeight.medium",
      cssVar: "--fsds-avatar-typography-font-weight-medium",
      ref: "core.typography.weight.medium",
      fallback: "500",
    },
    "avatar.typography.fontFamily.sans": {
      name: "avatar.typography.fontFamily.sans",
      cssVar: "--fsds-avatar-typography-font-family-sans",
      ref: "core.typography.font.family.sans",
      fallback: "\"Inter\", sans-serif",
    },
  },
} satisfies ComponentTokenScopes;

export function resolveAvatarTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(avatarTokenScopes, theme);
}
// @generated:end
