// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveFieldTokens } from "./Field.tokens";
// @generated:end

// @generated:start styles
export function createFieldStyles(theme?: FsdsTheme) {
  const tokens = resolveFieldTokens(theme);
  return StyleSheet.create({
    control: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined) },
    error: { color: (tokens.root?.["field.color.invalid-text"] as string | undefined) },
    header: {},
    help: { color: (tokens.root?.["field.color.fg"] as string | undefined) },
    label: { color: (tokens.root?.["field.label.color"] as string | undefined) },
    meta: { flexDirection: "column", gap: (tokens.root?.["field.gap.meta"] as number | undefined) },
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined) },
    validatingIndicator: { color: (tokens.root?.["field.color.fg"] as string | undefined) },
  });
}

export const styles = createFieldStyles();
// @generated:end
