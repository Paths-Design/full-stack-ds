// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createCodeBlockStyles } from "./CodeBlock.styles";
// @generated:end

// @generated:start types
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
export type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
// @generated:end

// @generated:start props
export interface CodeBlockProps {
  code: string;
  language: CodeBlockLanguage;
  highlight?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function CodeBlock({
  code,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CodeBlockProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCodeBlockStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.code}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
        {!(children) ? (
        <View
          style={styles.source}
        >
          <RNText>{code}</RNText>
        </View>
        ) : null}
      </View>
    </View>
  );
}
// @generated:end
