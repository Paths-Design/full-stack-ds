// @generated:start imports
import { StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveBlockquoteTokens } from "./Blockquote.tokens";
// @generated:end

// @generated:start styles
export function createBlockquoteStyles(theme?: FsdsTheme) {
  const tokens = resolveBlockquoteTokens(theme);
  return StyleSheet.create({
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["blockquote.color.border"] as string | undefined), borderWidth: (tokens.root?.["blockquote.size.border.accent"] as number | undefined), borderRadius: (tokens.root?.["blockquote.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["blockquote.color.foreground.primary"] as string | undefined), fontSize: (tokens.root?.["blockquote.size.fontSize.md"] as number | undefined), fontWeight: (tokens.root?.["blockquote.typography.fontWeight"] as TextStyle["fontWeight"]) }),
    rootText_variant_highlighted: definedStyle({ color: (tokens.variant_highlighted?.["blockquote.color.foreground.primary"] as string | undefined) }),
    rootText_variant_lg: definedStyle({ fontSize: (tokens.variant_lg?.["blockquote.size.fontSize.md"] as number | undefined) }),
    rootText_variant_md: definedStyle({ fontSize: (tokens.variant_md?.["blockquote.size.fontSize.md"] as number | undefined) }),
    rootText_variant_sm: definedStyle({ fontSize: (tokens.variant_sm?.["blockquote.size.fontSize.md"] as number | undefined) }),
    root_variant_bordered: definedStyle({ backgroundColor: (tokens.variant_bordered?.["blockquote.color.background"] as string | undefined), borderLeftWidth: (tokens.root?.["blockquote.size.border.accent"] as number | undefined), borderLeftColor: (tokens.root?.["blockquote.color.border"] as string | undefined), paddingLeft: (tokens.root?.["blockquote.size.padding"] as number | undefined) }),
    root_variant_default: definedStyle({ backgroundColor: (tokens.variant_default?.["blockquote.color.background"] as string | undefined), borderWidth: 0 }),
    root_variant_highlighted: definedStyle({ backgroundColor: (tokens.variant_highlighted?.["blockquote.color.background"] as string | undefined) }),
  });
}

export const styles = createBlockquoteStyles();
// @generated:end
