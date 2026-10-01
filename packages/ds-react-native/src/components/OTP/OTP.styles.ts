// @generated:start imports
import { StyleSheet } from "react-native";
import type { FsdsTheme } from "../../tokens";
import { resolveOTPTokens } from "./OTP.tokens";
// @generated:end

// @generated:start styles
export function createOTPStyles(theme?: FsdsTheme) {
  const tokens = resolveOTPTokens(theme);
  return StyleSheet.create({
    field: {},
    group: {},
    root: { paddingTop: (tokens.root?.["box-model.padding-block-start"] as number | undefined), paddingBottom: (tokens.root?.["box-model.padding-block-end"] as number | undefined), minHeight: (tokens.root?.["box-model.min-height"] as number | undefined), paddingLeft: (tokens.root?.["box-model.padding-inline-start"] as number | undefined), paddingRight: (tokens.root?.["box-model.padding-inline-end"] as number | undefined), gap: (tokens.root?.["box-model.gap"] as number | undefined), minWidth: (tokens.root?.["box-model.min-width"] as number | undefined), borderColor: (tokens.root?.["otp.color.border"] as string | undefined), borderRadius: (tokens.root?.["otp.size.radius"] as number | undefined) },
  });
}

export const styles = createOTPStyles();
// @generated:end
