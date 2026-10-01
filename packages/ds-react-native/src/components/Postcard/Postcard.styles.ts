// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolvePostcardTokens } from "./Postcard.tokens";
// @generated:end

// @generated:start styles
export function createPostcardStyles(theme?: FsdsTheme) {
  const tokens = resolvePostcardTokens(theme);
  return StyleSheet.create({
    content: {},
    displayName: {},
    footer: {},
    handle: {},
    header: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["postcard.color.background.default"] as string | undefined), borderColor: (tokens.root?.["postcard.color.border.default"] as string | undefined), borderWidth: (tokens.root?.["postcard.size.border"] as number | undefined), borderRadius: (tokens.root?.["postcard.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["postcard.color.foreground.primary"] as string | undefined) }),
    stat: {},
    stats: {},
    timestamp: {},
    userInfo: {},
  });
}

export const styles = createPostcardStyles();
// @generated:end
