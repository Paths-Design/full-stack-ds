// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveCodeBlockTokens } from "./CodeBlock.tokens";
// @generated:end

// @generated:start styles
export function createCodeBlockStyles(theme?: FsdsTheme) {
  const tokens = resolveCodeBlockTokens(theme);
  return StyleSheet.create({
    code: {},
    gutter: {},
    line: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), backgroundColor: (tokens.root?.["code-block.color.background.default"] as string | undefined), borderColor: (tokens.root?.["code-block.color.border.default"] as string | undefined), borderWidth: (tokens.root?.["code-block.size.border.default"] as number | undefined), borderRadius: (tokens.root?.["code-block.size.radius.default"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["code-block.color.foreground.primary"] as string | undefined), fontSize: (tokens.root?.["code-block.size.fontSize.default"] as number | undefined) }),
    source: {},
    token: {},
  });
}

export const styles = createCodeBlockStyles();
// @generated:end
