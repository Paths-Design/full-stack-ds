// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveAccordionTokens } from "./Accordion.tokens";
// @generated:end

// @generated:start styles
export function createAccordionStyles(theme?: FsdsTheme) {
  const tokens = resolveAccordionTokens(theme);
  return StyleSheet.create({
    chevron: {},
    content: {},
    contentInner: {},
    header: {},
    item: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderWidth: (tokens.root?.["accordion.border.width"] as number | undefined), borderRadius: (tokens.root?.["accordion.border.radius"] as number | undefined) },
    trigger: {},
  });
}

export const styles = createAccordionStyles();
// @generated:end
