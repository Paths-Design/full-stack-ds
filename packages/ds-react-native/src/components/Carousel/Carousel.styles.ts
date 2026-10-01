// @generated:start imports
import { StyleSheet } from "react-native";
import { definedStyle, type FsdsTheme } from "../../tokens";
import { resolveCarouselTokens } from "./Carousel.tokens";
// @generated:end

// @generated:start styles
export function createCarouselStyles(theme?: FsdsTheme) {
  const tokens = resolveCarouselTokens(theme);
  return StyleSheet.create({
    controls: {},
    next: {},
    pagination: {},
    previous: {},
    ring: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderRadius: (tokens.root?.["carousel.size.radius"] as number | undefined) },
    rootText: definedStyle({ color: (tokens.root?.["carousel.color.foreground"] as string | undefined) }),
    rotation: {},
    viewport: {},
  });
}

export const styles = createCarouselStyles();
// @generated:end
