// @generated:start imports
import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";
// @generated:end

// @generated:start tokens
export const calendarTokenScopes = {
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
    "calendar.color.foreground.primary": {
      name: "calendar.color.foreground.primary",
      cssVar: "--fsds-calendar-color-foreground-primary",
      ref: "semantic.color.foreground.primary",
      fallback: "#141414",
    },
    "calendar.color.border": {
      name: "calendar.color.border",
      cssVar: "--fsds-calendar-color-border",
      ref: "semantic.color.border.subtle",
      fallback: "#d0d0d0",
    },
    "calendar.color.day.selected.background": {
      name: "calendar.color.day.selected.background",
      cssVar: "--fsds-calendar-color-day-selected-background",
      ref: "semantic.color.background.accent",
      fallback: "#d92d2e",
    },
    "calendar.size.radius": {
      name: "calendar.size.radius",
      cssVar: "--fsds-calendar-size-radius",
      ref: "semantic.shape.control.radius.default",
      fallback: 6,
    },
  },
} satisfies ComponentTokenScopes;

export function resolveCalendarTokens(theme?: FsdsTheme) {
  return resolveComponentTokens(calendarTokenScopes, theme);
}
// @generated:end
