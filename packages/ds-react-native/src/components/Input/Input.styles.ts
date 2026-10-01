// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveInputTokens } from "./Input.tokens";
// @generated:end

// @generated:start styles
export function createInputStyles(theme?: FsdsTheme) {
  const tokens = resolveInputTokens(theme);
  return StyleSheet.create({
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["input.color.bg.default"] as string | undefined), borderColor: (tokens.root?.["input.color.border.default"] as string | undefined), borderWidth: (tokens.root?.["input.size.border"] as number | undefined), borderRadius: (tokens.root?.["input.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["input.color.text.default"] as string | undefined), fontSize: (tokens.root?.["input.typography.size"] as number | undefined) }),
    root_state_disabled: definedStyle({ backgroundColor: (tokens.root?.["input.color.bg.disabled"] as string | undefined), borderColor: (tokens.root?.["input.color.border.disabled"] as string | undefined), opacity: (tokens.root?.["input.opacity.disabled"] as number | undefined) }),
  });
}

export const styles = createInputStyles();
// @generated:end
