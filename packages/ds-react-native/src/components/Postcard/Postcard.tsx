// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createPostcardStyles } from "./Postcard.styles";
// @generated:end

// @generated:start types
export type PostcardAuthor = { name: string; handle: string; avatar: string };
export type PostcardStats = { likes: number; replies: number; reposts: number };
export type PostcardEmbed = { type: 'image' | 'video' | 'audio'; url: string; aspectRatio: { width: number; height: number } };
// @generated:end

// @generated:start props
export interface PostcardProps {
  postId: string;
  author: PostcardAuthor;
  timestamp: string;
  stats: PostcardStats;
  embed?: PostcardEmbed;
  type?: "image" | "video" | "audio";
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Postcard({
  author,
  timestamp,
  stats,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: PostcardProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createPostcardStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.header}
      >
        <View
          style={styles.userInfo}
        >
          <View
            style={styles.displayName}
          >
            <RNText style={styles.rootText}>{author.name}</RNText>
          </View>
          <View
            style={styles.handle}
          >
            <RNText style={styles.rootText}>{author.handle}</RNText>
          </View>
        </View>
        <View
          style={styles.timestamp}
        >
          <RNText style={styles.rootText}>{timestamp}</RNText>
        </View>
      </View>
      <View
        style={styles.content}
      >
        {typeof children === "string" ? <RNText style={styles.rootText}>{children}</RNText> : children}
      </View>
      <View
        style={styles.footer}
      >
        <View
          style={styles.stats}
        >
          <View
            style={styles.stat}
          >
            <RNText style={styles.rootText}>{stats.likes}</RNText>
          </View>
        </View>
      </View>
    </View>
  );
}
// @generated:end
