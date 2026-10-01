// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveDialogTokens } from "./Dialog.tokens";
// @generated:end

// @generated:start styles
export function createDialogStyles(theme?: FsdsTheme) {
  const tokens = resolveDialogTokens(theme);
  return StyleSheet.create({
    backdrop: {},
    body: {},
    closeButton: {},
    footer: {},
    header: {},
    modal: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["dialog.color.border"] as string | undefined), borderRadius: (tokens.root?.["dialog.size.radius"] as number | undefined) },
    title: {},
  });
}

export const styles = createDialogStyles();
// @generated:end
