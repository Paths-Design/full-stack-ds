import { View, type StyleProp, type ViewStyle } from "react-native";
import { renderTextChildren } from "./text-children";
import type { ReactNode } from "react";

type StackVariant = "vertical" | "horizontal";
type StackLayout = "stack" | "native";

export interface StackProps {
  variant?: StackVariant;
  layout?: StackLayout;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Stack({
  variant = "vertical",
  layout = "stack",
  children,
  style,
  testID,
}: StackProps) {
  const layoutStyle: ViewStyle | undefined = layout === "stack"
    ? {
        display: "flex",
        flexDirection: variant === "horizontal" ? "row" : "column",
      }
    : undefined;

  return (
    <View testID={testID} style={[layoutStyle, style]}>
      {renderTextChildren(children)}
    </View>
  );
}
