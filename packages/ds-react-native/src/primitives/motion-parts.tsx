import { createContext, useContext, useState, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { BudgetProgress } from "./budget-progress";

export interface MotionPartProjection {
  effect: "elapsed-width" | "elapsed-ring";
  elapsed: number;
  reducedMotion: boolean;
  steps: number;
  visible: boolean;
  activeIndex?: number;
}
type MotionParts = Readonly<Record<string, MotionPartProjection | undefined>>;
const empty: MotionParts = Object.freeze({});
const PartsContext = createContext<MotionParts>(empty);
export const MotionPartsProvider = PartsContext.Provider;

/** Consume a composition edge once. The cleared context prevents incoming
 * bindings from reaching the component's children or nested compositions.
 */
export function MotionPartScope({ children }: { children: (parts: MotionParts) => ReactNode }) {
  const parts = useContext(PartsContext);
  return <PartsContext.Provider value={empty}>{children(parts)}</PartsContext.Provider>;
}

/** Paint a passive budget sample in geometry owned by the receiving part.
 * Unbound parts retain their normal rendering; hidden bindings paint nothing.
 */
export function MotionPart({ projection, index, style, children }: {
  projection?: MotionPartProjection;
  index?: number;
  style: ViewStyle;
  children: ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  if (!projection) return children;
  if (!projection.visible || projection.activeIndex !== undefined && projection.activeIndex !== index) return null;
  const color = style.backgroundColor ?? style.borderColor ?? "transparent";
  const width = typeof style.width === "number" ? style.width : size.width;
  const height = typeof style.height === "number" ? style.height : size.height;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ ...style, backgroundColor: "transparent", borderColor: "transparent" }}
    onLayout={event => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
    {width > 0 && height > 0 ? <BudgetProgress effect={projection.effect} elapsed={projection.elapsed}
      reducedMotion={projection.reducedMotion} steps={projection.steps} width={width} height={height}
      thickness={style.borderWidth ?? height / 2} color={String(color)} trackColor="transparent" /> : null}
  </View>;
}
