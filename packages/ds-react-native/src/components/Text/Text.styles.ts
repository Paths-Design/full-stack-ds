// @generated:start imports
import { StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveTextTokens } from "./Text.tokens";
// @generated:end

// @generated:start styles
export function createTextStyles(theme?: FsdsTheme) {
  const tokens = resolveTextTokens(theme);
  return StyleSheet.create({
    root: { ...{ paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined) }, ...definedStyle({ color: (tokens.root?.["text.color.foreground.primary"] as string | undefined), fontSize: (tokens.root?.["text.size.md"] as number | undefined) }) },
    root_variant_2xl: definedStyle({ fontSize: (tokens.variant_2xl?.["text.size.md"] as number | undefined) }),
    root_variant_3xl: definedStyle({ fontSize: (tokens.variant_3xl?.["text.size.md"] as number | undefined) }),
    root_variant_body: definedStyle({ fontSize: (tokens.variant_body?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.regular"] as TextStyle["fontWeight"]) }),
    root_variant_bold: definedStyle({ fontWeight: (tokens.root?.["text.typography.fontWeight.bold"] as TextStyle["fontWeight"]) }),
    root_variant_capitalize: definedStyle({ textTransform: "capitalize" }),
    root_variant_caption: definedStyle({ fontSize: (tokens.variant_caption?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.regular"] as TextStyle["fontWeight"]) }),
    root_variant_center: definedStyle({ textAlign: "center" }),
    root_variant_code: definedStyle({ fontSize: (tokens.variant_code?.["text.size.md"] as number | undefined), fontFamily: "\"Monaspace\", ui-monospace, SFMono-Regular, Menlo, monospace" }),
    root_variant_display: definedStyle({ fontSize: (tokens.variant_display?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.bold"] as TextStyle["fontWeight"]) }),
    root_variant_headline: definedStyle({ fontSize: (tokens.variant_headline?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.bold"] as TextStyle["fontWeight"]) }),
    root_variant_justify: definedStyle({ textAlign: "justify" }),
    root_variant_left: definedStyle({ textAlign: "left" }),
    root_variant_lg: definedStyle({ fontSize: (tokens.variant_lg?.["text.size.md"] as number | undefined) }),
    root_variant_light: definedStyle({ fontWeight: (tokens.root?.["text.typography.fontWeight.light"] as TextStyle["fontWeight"]) }),
    root_variant_lowercase: definedStyle({ textTransform: "lowercase" }),
    root_variant_md: definedStyle({ fontSize: (tokens.variant_md?.["text.size.md"] as number | undefined) }),
    root_variant_medium: definedStyle({ fontWeight: (tokens.root?.["text.typography.fontWeight.medium"] as TextStyle["fontWeight"]) }),
    root_variant_normal: definedStyle({ fontWeight: (tokens.root?.["text.typography.fontWeight.regular"] as TextStyle["fontWeight"]) }),
    root_variant_overline: definedStyle({ fontSize: (tokens.variant_overline?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.medium"] as TextStyle["fontWeight"]), textTransform: "uppercase" }),
    root_variant_right: definedStyle({ textAlign: "right" }),
    root_variant_semibold: definedStyle({ fontWeight: (tokens.root?.["text.typography.fontWeight.medium"] as TextStyle["fontWeight"]) }),
    root_variant_sm: definedStyle({ fontSize: (tokens.variant_sm?.["text.size.md"] as number | undefined) }),
    root_variant_title: definedStyle({ fontSize: (tokens.variant_title?.["text.size.md"] as number | undefined), fontWeight: (tokens.root?.["text.typography.fontWeight.bold"] as TextStyle["fontWeight"]) }),
    root_variant_uppercase: definedStyle({ textTransform: "uppercase" }),
    root_variant_xl: definedStyle({ fontSize: (tokens.variant_xl?.["text.size.md"] as number | undefined) }),
    root_variant_xs: definedStyle({ fontSize: (tokens.variant_xs?.["text.size.md"] as number | undefined) }),
  });
}

export const styles = createTextStyles();
// @generated:end
