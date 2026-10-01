// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveCheckboxTokens } from "./Checkbox.tokens";
// @generated:end

// @generated:start styles
export function createCheckboxStyles(theme?: FsdsTheme) {
  const tokens = resolveCheckboxTokens(theme);
  return StyleSheet.create({
    indicator: { alignItems: "center", height: 20, justifyContent: "center", width: 20, borderWidth: (tokens.root?.["checkbox.border.width"] as number | undefined), borderRadius: (tokens.root?.["checkbox.border.radius"] as number | undefined) },
    indicatorMark: { color: "#ffffff", fontSize: 12, fontWeight: "700", lineHeight: 16 },
    indicator_checked: {},
    input: { paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), alignItems: "center", flexDirection: "row" },
    label: {},
    root: { paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), alignItems: "center", flexDirection: "row" },
  });
}

export const styles = createCheckboxStyles();
// @generated:end
