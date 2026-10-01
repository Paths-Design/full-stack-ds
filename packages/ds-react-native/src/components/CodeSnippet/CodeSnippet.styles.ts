// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveCodeSnippetTokens } from "./CodeSnippet.tokens";
// @generated:end

// @generated:start styles
export function createCodeSnippetStyles(theme?: FsdsTheme) {
  const tokens = resolveCodeSnippetTokens(theme);
  return StyleSheet.create({
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["code-snippet.color.border"] as string | undefined), borderWidth: (tokens.root?.["code-snippet.size.border"] as number | undefined), borderRadius: (tokens.root?.["code-snippet.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["code-snippet.color.foreground.primary"] as string | undefined), fontSize: (tokens.root?.["code-snippet.size.fontSize"] as number | undefined) }),
    rootText_variant_kbd: definedStyle({ fontWeight: 500 }),
    root_variant_samp: definedStyle({ backgroundColor: "transparent", borderColor: "transparent" }),
  });
}

export const styles = createCodeSnippetStyles();
// @generated:end
