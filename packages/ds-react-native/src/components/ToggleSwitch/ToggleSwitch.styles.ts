// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveToggleSwitchTokens } from "./ToggleSwitch.tokens";
// @generated:end

// @generated:start styles
export function createToggleSwitchStyles(theme?: FsdsTheme) {
  const tokens = resolveToggleSwitchTokens(theme);
  return StyleSheet.create({
    input: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["toggle-switch.color.background.default"] as string | undefined), borderColor: (tokens.root?.["toggle-switch.color.border"] as string | undefined), borderRadius: (tokens.root?.["toggle-switch.border.radius"] as number | undefined) },
    label: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["toggle-switch.color.background.default"] as string | undefined), borderColor: (tokens.root?.["toggle-switch.color.border"] as string | undefined), borderRadius: (tokens.root?.["toggle-switch.border.radius"] as number | undefined), alignItems: "center", justifyContent: "center" },
    root_large: {},
    root_medium: {},
    root_small: {},
  });
}

export const styles = createToggleSwitchStyles();
// @generated:end
