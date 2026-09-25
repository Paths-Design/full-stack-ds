// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createCodeBlockStyles } from "./CodeBlock.styles";
import { resolveCodeBlockTokens } from "./CodeBlock.tokens";
import { prepareSourceLines } from "../../primitives/highlight/source-model";
// @generated:end

// @generated:start types
export type CodeBlockToken = { kind: CodeBlockTokenType; text: string };
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
export type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
// @generated:end

// @generated:start props
export interface CodeBlockProps {
  code: string;
  language: CodeBlockLanguage;
  highlight?: boolean;
  tokens?: CodeBlockToken[];
  showLineNumbers?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export interface CodeBlockLineProps { number: number; showLineNumbers?: boolean; children?: ReactNode }
export function CodeBlockLine({ number, showLineNumbers = false, children }: CodeBlockLineProps) {
  const fsdsTheme = useFsdsTheme();
  const tokens = useMemo(() => resolveCodeBlockTokens(fsdsTheme), [fsdsTheme]);
  const styles = useMemo(() => createCodeBlockStyles(fsdsTheme), [fsdsTheme]);
  return <View style={{ flexDirection: "row" }}><RNText accessible={false} style={{ display: showLineNumbers ? "flex" : "none", minWidth: 32, textAlign: "right", color: tokens.root?.["code-block.gutter.color.number"] as string | undefined, marginRight: tokens.root?.["code-block.gutter.size.gap"] as number | undefined }}>{number}</RNText><RNText style={styles.rootText}>{children}</RNText></View>;
}
export interface CodeBlockTokenProps { kind: CodeBlockTokenType; children?: ReactNode }
export function CodeBlockToken({ kind, children }: CodeBlockTokenProps) {
  const fsdsTheme = useFsdsTheme();
  const tokens = useMemo(() => resolveCodeBlockTokens(fsdsTheme), [fsdsTheme]);
  const colors: Partial<Record<CodeBlockTokenType, string | undefined>> = {
    "plain": tokens.root?.["code-block.token.color.plain"] as string | undefined,
    "comment": tokens.root?.["code-block.token.color.comment"] as string | undefined,
    "keyword": tokens.root?.["code-block.token.color.keyword"] as string | undefined,
    "definition": tokens.root?.["code-block.token.color.definition"] as string | undefined,
    "punctuation": tokens.root?.["code-block.token.color.punctuation"] as string | undefined,
    "property": tokens.root?.["code-block.token.color.property"] as string | undefined,
    "static": tokens.root?.["code-block.token.color.static"] as string | undefined,
    "string": tokens.root?.["code-block.token.color.string"] as string | undefined,
    "tag": tokens.root?.["code-block.token.color.tag"] as string | undefined,
  };
  return <RNText style={{ color: colors[kind] }}>{children}</RNText>;
}
export function CodeBlock({ code, tokens: suppliedTokens, highlight = true, showLineNumbers = false, children, style, testID, accessibilityLabel, accessibilityLabelledBy }: CodeBlockProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCodeBlockStyles(fsdsTheme), [fsdsTheme]);
  const source = useMemo(() => prepareSourceLines(code, suppliedTokens, highlight), [code, suppliedTokens, highlight]);
  return <View testID={testID} style={[styles.root, style]} accessible accessibilityLabel={accessibilityLabel ?? code} accessibilityLabelledBy={accessibilityLabelledBy}>
    {children ? (typeof children === "string" ? <RNText style={styles.rootText}>{children}</RNText> : children) : source.lines.map((line) => <CodeBlockLine key={line.number} number={line.number} showLineNumbers={showLineNumbers}>{line.tokens.map((token, index) => source.highlighted ? <CodeBlockToken key={index} kind={token.kind}>{token.text}</CodeBlockToken> : token.text)}</CodeBlockLine>)}
  </View>;
}
// @generated:end
