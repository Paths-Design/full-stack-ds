import { resolveIcon } from "@full-stack-ds/iconography";
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewProps } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Native paint for the shared icon catalog. The containing component owns
 * labeling; the glyph does not create a second accessibility element.
 */
export function NativeGlyph({ name, size, frameStyle, style, ...props }: Omit<ViewProps, "style"> & {
  name: string;
  size?: number;
  style?: StyleProp<TextStyle>;
  frameStyle?: StyleProp<TextStyle>;
}) {
  const glyph = resolveIcon(name, size ?? 0);
  if (!glyph) return null;
  const frame = StyleSheet.flatten(frameStyle);
  const paint = StyleSheet.flatten(style);
  const width = frame?.width ?? paint?.width ?? size ?? glyph.size;
  const height = frame?.height ?? paint?.height ?? size ?? glyph.size;
  return <View accessible={false} {...props} style={[style, { width, height }]}>
    <Svg width="100%" height="100%" viewBox={glyph.viewBox} fill="none"
      color={frame?.color ?? paint?.color ?? "#000000"} accessible={false}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {glyph.paths.map((path, index) => <Path key={index} d={path.d} fill={path.fill}
        stroke={path.stroke} strokeWidth={path.strokeWidth} strokeLinecap={path.strokeLineCap}
        strokeLinejoin={path.strokeLineJoin} strokeDasharray={path.strokeDasharray}
        fillRule={path.fillRule} clipRule={path.clipRule} />)}
    </Svg>
  </View>;
}
