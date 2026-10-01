// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveMarkdownTokens } from "./Markdown.tokens";
// @generated:end

// @generated:start styles
export function createMarkdownStyles(theme?: FsdsTheme) {
  const tokens = resolveMarkdownTokens(theme);
  return StyleSheet.create({
    blockquote: {},
    code: {},
    codeBlock: {},
    emphasis: {},
    heading: {},
    link: {},
    listItem: {},
    orderedList: {},
    paragraph: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["markdown.color.foreground"] as string | undefined), fontSize: (tokens.root?.["markdown.typography.fontSize"] as number | undefined) }),
    strong: {},
    unorderedList: {},
  });
}

export const styles = createMarkdownStyles();
// @generated:end
